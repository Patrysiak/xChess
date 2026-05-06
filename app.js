// ================= IMPORTY FIREBASE I DANYCH =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { mockData, TIME_CONSTANTS } from './mockData.js';

// KONFIGURACJA FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDVip74fl5K2fnLjlCOBLJfBnq7lxglyoU",
    authDomain: "xchess-79e2d.firebaseapp.com",
    projectId: "xchess-79e2d",
    storageBucket: "xchess-79e2d.firebasestorage.app",
    messagingSenderId: "382071993193",
    appId: "1:382071993193:web:86dbe5211f2151cb5383f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ================= STAN APLIKACJI =================
let currentUser = null;
let currentContext = "home"; // "home" lub "server"
let postTimer = null;
let tempAvatarBase64 = null;
let tempPostImgBase64 = null;

const XP_PER_MSG = 15;

// ================= LOGIKA LOGOWANIA (AUTH) =================
window.loginWithGoogle = () => {
    const btn = document.getElementById('btn-login');
    btn.innerText = "Łączenie z serwerem...";
    signInWithPopup(auth, provider).catch(e => {
        alert("Błąd: " + e.message);
        btn.innerText = "Zaloguj przez Google";
    });
};

window.logout = () => {
    signOut(auth);
    window.closeModal('settings-modal');
};

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        loginScreen.classList.remove('active');
        appContainer.classList.add('active');
        
        // Pobieranie profilu z Firestore
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        let avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
        
        if (!docSnap.exists()) {
            // Nowy użytkownik
            currentUser = { 
                uid: user.uid, 
                name: user.displayName, 
                avatar: avatarUrl, 
                xp: 0, 
                level: 1, 
                prestige: 0, 
                status: "online", 
                post: null 
            };
            await setDoc(docRef, currentUser);
        } else {
            // Istniejący użytkownik
            currentUser = docSnap.data();
            // Zabezpieczenie brakujących danych
            if(currentUser.xp === undefined) { currentUser.xp = 0; currentUser.level = 1; currentUser.prestige = 0; }
        }
        
        // Dodaj zalogowanego gracza do bazy MockDB (by był widoczny na serwerze i u znajomych)
        mockData.serverRoles[2].users.push({ 
            name: currentUser.name, avatar: currentUser.avatar, lvl: currentUser.level, prestige: currentUser.prestige, status: currentUser.status 
        });
        mockData.friends.unshift({ 
            id: "me", name: currentUser.name, avatar: currentUser.avatar, post: currentUser.post, status: currentUser.status 
        });
        
        checkExpiredPosts();
        updateXPUI();
        window.switchToServer(); // Na start wchodzimy na serwer
    } else {
        loginScreen.classList.add('active');
        appContainer.classList.remove('active');
    }
});

// ================= SYSTEM XP I PRESTIŻU =================
function getXpNeeded(lvl) {
    return Math.floor(100 * Math.pow(1.3, lvl - 1)); // Skalowanie trudności
}

window.updateXPUI = () => {
    document.getElementById('my-avatar').src = currentUser.avatar;
    document.getElementById('my-name').innerText = currentUser.name;
    
    let prestigeStr = currentUser.prestige > 0 ? `[P${currentUser.prestige}] ` : "";
    document.getElementById('my-lvl-text').innerText = `${prestigeStr}Poziom ${currentUser.level}`;
    
    let needed = getXpNeeded(currentUser.level);
    let percent = (currentUser.xp / needed) * 100;
    document.getElementById('my-xp-bar').style.width = percent + "%";
};

function gainXp() {
    currentUser.xp += XP_PER_MSG;
    let needed = getXpNeeded(currentUser.level);
    
    if(currentUser.xp >= needed) {
        currentUser.xp -= needed;
        currentUser.level++;
        
        // Prestiż zdobywamy co 50 poziomów!
        if(currentUser.level > 50) {
            currentUser.level = 1;
            currentUser.prestige++;
            window.showToast(`🏆 PRESTIŻ +1! Gratulacje, zaczynasz od nowa jako legenda!`, "var(--prestige-gold)");
        } else {
            window.showToast(`🎉 Awansowałeś na Poziom ${currentUser.level}!`, "var(--brand-color)");
        }
        
        // Zapisz w Firebase
        setDoc(doc(db, 'users', currentUser.uid), currentUser);
        
        // Update w MockDB, by po prawej stronie od razu zaktualizowała się odznaka
        mockData.serverRoles[2].users[0].lvl = currentUser.level;
        mockData.serverRoles[2].users[0].prestige = currentUser.prestige;
        
        if(currentContext === "server") window.switchToServer(); // Refresh prawego panelu
    }
    
    window.updateXPUI();
    // Ciche zapisywanie XP w tle co wiadomość
    setDoc(doc(db, 'users', currentUser.uid), currentUser); 
}

// ================= SYSTEM TOASTÓW (POWIADOMIEŃ) =================
window.showToast = (msg, color) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color;
    toast.innerHTML = `<span style="font-size:20px;">🔥</span> <div>${msg}</div>`;
    container.appendChild(toast);
    
    // Zniknij po 4 sekundach
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
};

// ================= NAWIGACJA (SERWER VS ZNAJOMI) =================
window.switchToServer = () => {
    currentContext = "server";
    document.getElementById('nav-server').classList.add('active');
    document.getElementById('nav-home').classList.remove('active');
    
    document.getElementById('chat-header-title').innerHTML = `<svg style="color:#80848e; margin-right:8px;"><path d="M21 8.5h-4.5V4h-2v4.5H9.5V4h-2v4.5H3v2h4.5V15H3v2h4.5v4.5h2V17h5v4.5h2V17H21v-2h-4.5v-4.5H21v-2zm-6.5 6.5h-5v-4.5h5v4.5z"/></svg> ogólny`;
    document.getElementById('sidebar-header-area').innerHTML = `<span id="sidebar-title">33MC.PL</span>`;
    
    document.getElementById('sidebar-content').innerHTML = `
        <div class="category-name">Kanały Tekstowe</div>
        <div class="list-item active"><svg><path d="M21 8.5h-4.5V4h-2v4.5H9.5V4h-2v4.5H3v2h4.5V15H3v2h4.5v4.5h2V17h5v4.5h2V17H21v-2h-4.5v-4.5H21v-2zm-6.5 6.5h-5v-4.5h5v4.5z"/></svg> ogólny</div>
    `;

    renderMessages();
    renderRightPanelRoles();
};

window.switchToDM = () => {
    currentContext = "home";
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('nav-server').classList.remove('active');
    
    document.getElementById('chat-header-title').innerHTML = `<svg style="color:#80848e; margin-right:8px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg> Znajomi`;
    document.getElementById('sidebar-header-area').innerHTML = `<input type="text" placeholder="Szukaj..." style="width:100%; background:var(--bg-tertiary); color:white; padding:6px 8px; border-radius:4px; font-size:13px;">`;
    
    checkExpiredPosts(); // Upewnij się, że nie wyświetlamy starych obwódek
    
    let sb = `<div class="category-name">Prywatne Wiadomości</div>`;
    mockData.friends.forEach(f => {
        const hasPost = f.post ? "has-post" : "";
        const dotColor = { "online": "var(--success-color)", "idle": "var(--warning-color)", "dnd": "var(--danger-color)", "offline": "gray" }[f.status] || "gray";
        
        sb += `
            <div class="list-item">
                <div class="avatar-container" onclick="window.viewPost('${f.id}')">
                    <img src="${f.avatar}" class="list-avatar ${hasPost}">
                    <div class="status-dot" style="background:${dotColor}"></div>
                </div>
                <div>${f.id === "me" ? "Ty" : f.name}</div>
            </div>`;
    });
    
    document.getElementById('sidebar-content').innerHTML = sb;
    document.getElementById('messages-area').innerHTML = `
        <div style="padding:16px; border-bottom:1px solid var(--bg-modifier-active);">
            <h1 style="color:white; font-size:24px;">Wybierz znajomego by rozpocząć czat!</h1>
            <p style="color:var(--text-muted); margin-top:5px;">Po lewej stronie widzisz aktywne relacje oznaczone pomarańczową ramką.</p>
        </div>
    `;
    
    // Prawy panel - Aktywni
    let rp = `<div class="role-header">Aktywni Teraz</div>`;
    mockData.friends.forEach(f => {
        if(f.id !== "me" && f.status === "online") {
            rp += `
                <div class="member-item">
                    <img src="${f.avatar}" class="member-avatar">
                    <div>
                        <h4 style="color:white;">${f.name}</h4>
                        <p style="color:var(--success-color); font-size:11px;">Gra w Minecraft</p>
                    </div>
                </div>`;
        }
    });
    document.getElementById('right-panel').innerHTML = rp;
};

// ================= RENDEROWANIE WIADOMOŚCI I ROL =================
function renderMessages() {
    let html = "";
    mockData.messages.forEach(m => {
        let badges = `<span class="lvl-badge">Lvl ${m.lvl}</span>`;
        if(m.prestige > 0) badges += ` <span class="prestige-badge">P${m.prestige}</span>`;
        
        html += `
            <div class="message">
                <img src="${m.avatar}" class="msg-avatar">
                <div class="msg-header">
                    <span class="msg-author">${m.author} ${badges}</span>
                    <span class="msg-time">${m.time}</span>
                </div>
                <div class="msg-content">${m.text}</div>
            </div>`;
    });
    const container = document.getElementById('messages-area');
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function renderRightPanelRoles() {
    let rp = "";
    mockData.serverRoles.forEach(role => {
        if(role.users.length > 0) {
            rp += `<div class="role-header">${role.name} - ${role.users.length}</div>`;
            role.users.forEach(u => {
                let badges = `<span class="lvl-badge">Lvl ${u.lvl}</span>`;
                if(u.prestige > 0) badges += `<span class="prestige-badge">P${u.prestige}</span>`;
                
                rp += `
                    <div class="member-item">
                        <img src="${u.avatar}" class="member-avatar">
                        <div>
                            <h4 class="${role.color}">${u.name}</h4>
                            <div style="display:flex; gap:5px; margin-top:2px;">${badges}</div>
                        </div>
                    </div>`;
            });
        }
    });
    document.getElementById('right-panel').innerHTML = rp;
}

// Dodawanie nowej wiadomości
document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === "Enter" && this.value.trim() !== "") {
        mockData.messages.push({ 
            author: currentUser.name, 
            avatar: currentUser.avatar, 
            text: this.value.trim(), 
            time: "Dzisiaj o " + new Date().toLocaleTimeString().slice(0,5), 
            lvl: currentUser.level, 
            prestige: currentUser.prestige 
        });
        this.value = "";
        
        // Zdobądź XP!
        gainXp(); 
        
        if (currentContext === "server") renderMessages();
    }
});

// ================= SYSTEM RELACJI (POSTÓW) 24H =================

// Sprawdza czy posty mają więcej niż 24h i usuwa je z logiki
function checkExpiredPosts() {
    const now = Date.now();
    mockData.friends.forEach(f => {
        if (f.post && f.post.timestamp) {
            if (now - f.post.timestamp > TIME_CONSTANTS.ONE_DAY_MS) {
                f.post = null; // Czas minął, usuwamy post
                
                // Jeśli to nasz post, wyczyść też w Firebase
                if(f.id === "me" && currentUser) {
                    currentUser.post = null;
                    setDoc(doc(db, 'users', currentUser.uid), currentUser);
                }
            }
        }
    });
}

// Obsługa wgrywania zdjęcia do posta
window.handlePostImage = (e) => {
    const file = e.target.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = (ev) => {
            tempPostImgBase64 = ev.target.result;
            document.getElementById('post-image-preview').src = tempPostImgBase64;
            document.getElementById('post-image-preview').style.display = 'block';
            document.getElementById('post-upload-text').style.display = 'none';
        };
        r.readAsDataURL(file);
    }
};

window.publishPost = async () => {
    const text = document.getElementById('new-post-text').value.trim();
    if(!text && !tempPostImgBase64) return window.showToast("Dodaj tekst lub zdjęcie!", "var(--warning-color)");
    
    // Struktura posta z Timestampem!
    currentUser.post = { 
        text: text, 
        img: tempPostImgBase64, 
        timestamp: Date.now() 
    };
    
    await setDoc(doc(db, 'users', currentUser.uid), currentUser);
    mockData.friends[0].post = currentUser.post; // Index 0 to "Ty"
    
    window.closeModal('add-post-modal');
    document.getElementById('new-post-text').value = "";
    document.getElementById('post-image-preview').style.display = "none";
    document.getElementById('post-upload-text').style.display = "block";
    tempPostImgBase64 = null;
    
    window.showToast("Pomyślnie dodano relację! (Zniknie za 24h)", "var(--success-color)");
    if(currentContext === "home") window.switchToDM(); 
};

window.viewPost = (userId) => {
    const f = mockData.friends.find(x => x.id === userId);
    if(!f || !f.post) return; // Brak aktywnego posta
    
    const modal = document.getElementById('post-viewer-modal');
    modal.classList.add('active');
    
    document.getElementById('post-viewer-avatar').src = f.avatar;
    document.getElementById('post-viewer-name').innerText = f.name === currentUser.name ? "Twój Post" : f.name;
    
    // Oblicz ile godzin temu dodano
    const diffHours = Math.floor((Date.now() - f.post.timestamp) / TIME_CONSTANTS.ONE_HOUR_MS);
    document.getElementById('post-viewer-time').innerText = diffHours === 0 ? "Dodano przed chwilą" : `Dodano ${diffHours} godz. temu`;
    
    const bgImg = document.getElementById('post-viewer-img');
    if(f.post.img) { 
        bgImg.src = f.post.img; 
        bgImg.style.display = 'block'; 
    } else { 
        bgImg.style.display = 'none'; 
    }
    
    document.getElementById('post-viewer-text').innerText = f.post.text;
    
    // Animacja paska postępu od zera
    const prog = document.getElementById('post-progress');
    prog.style.transition = "none"; 
    prog.style.width = "0%";
    
    // Timeout na animację paska (6 sekund)
    setTimeout(() => { 
        prog.style.transition = "width 6s linear"; 
        prog.style.width = "100%"; 
    }, 50);
    
    // Automatyczne zamykanie modala po 6 sekundach
    clearTimeout(postTimer);
    postTimer = setTimeout(() => window.closePostViewer(), 6000);
};

window.closePostViewer = () => { 
    document.getElementById('post-viewer-modal').classList.remove('active'); 
    clearTimeout(postTimer); 
};

// ================= OBSŁUGA MODALI I USTAWIEŃ =================
window.openModal = (id) => { 
    document.getElementById(id).classList.add('active'); 
    if(id === 'settings-modal') {
        document.getElementById('edit-name').value = currentUser.name;
        document.getElementById('edit-status').value = currentUser.status;
        document.getElementById('settings-avatar-preview').src = currentUser.avatar;
        tempAvatarBase64 = currentUser.avatar;
    }
};

window.closeModal = (id) => {
    document.getElementById(id).classList.remove('active');
};

// Podpięcie przycisków w HTML pod Modale
document.getElementById('btn-add-post').addEventListener('click', () => window.openModal('add-post-modal'));
document.getElementById('btn-settings').addEventListener('click', () => window.openModal('settings-modal'));
document.getElementById('btn-open-settings').addEventListener('click', () => window.openModal('settings-modal'));

window.handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = (ev) => { 
            tempAvatarBase64 = ev.target.result; 
            document.getElementById('settings-avatar-preview').src = tempAvatarBase64; 
        };
        r.readAsDataURL(file);
    }
};

window.saveSettings = async () => {
    const btn = document.querySelector('#settings-modal .btn-submit');
    btn.innerText = "Zapisywanie...";
    
    currentUser.name = document.getElementById('edit-name').value;
    currentUser.status = document.getElementById('edit-status').value;
    currentUser.avatar = tempAvatarBase64;
    
    await setDoc(doc(db, 'users', currentUser.uid), currentUser);
    
    // Sync UI
    mockData.friends[0].name = currentUser.name;
    mockData.friends[0].avatar = currentUser.avatar;
    mockData.friends[0].status = currentUser.status;
    mockData.serverRoles[2].users[0].name = currentUser.name;
    mockData.serverRoles[2].users[0].avatar = currentUser.avatar;
    
    window.updateXPUI();
    window.closeModal('settings-modal');
    btn.innerText = "Zapisz Zmiany";
    window.showToast("Pomyślnie zaktualizowano profil!", "var(--success-color)");
    
    if(currentContext === "home") window.switchToDM();
};
