import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { mockData, TIME_CONSTANTS } from './mockData.js';

const firebaseConfig = {
    apiKey: "AIzaSyDVip74fl5K2fnLjlCOBLJfBnq7lxglyoU",
    authDomain: "xchess-79e2d.firebaseapp.com",
    projectId: "xchess-79e2d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentContext = "server"; // "home" lub "server"
let postTimer = null;
let tempAvatarBase64 = null;
let tempPostImgBase64 = null;

const XP_PER_MSG = 25;

// ================= LOGOWANIE =================
document.getElementById('btn-login').addEventListener('click', () => {
    document.getElementById('btn-login').innerText = "Łączenie...";
    signInWithPopup(auth, provider).catch(e => { alert(e.message); document.getElementById('btn-login').innerText = "Zaloguj przez Google"; });
});

document.getElementById('btn-logout').addEventListener('click', () => { signOut(auth); closeModal('settings-modal'); });

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');
        
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        let avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
        
        if (!docSnap.exists()) {
            currentUser = { uid: user.uid, name: user.displayName, avatar: avatarUrl, xp: 0, level: 1, prestige: 0, status: "online", post: null };
            await setDoc(docRef, currentUser);
        } else {
            currentUser = docSnap.data();
            if(currentUser.xp === undefined) { currentUser.xp = 0; currentUser.level = 1; currentUser.prestige = 0; }
        }
        
        // Aktualizacja MockData dla widoczności UI
        mockData.serverRoles[2].users.push({ name: currentUser.name, avatar: currentUser.avatar, lvl: currentUser.level, prestige: currentUser.prestige, status: currentUser.status });
        mockData.friends.unshift({ id: "me", name: currentUser.name, avatar: currentUser.avatar, post: currentUser.post, status: currentUser.status });
        
        checkExpiredPosts();
        updateXPUI();
        switchToServer();
    } else {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-container').classList.remove('active');
    }
});

// ================= SYSTEM XP =================
function getXpNeeded(lvl) { return Math.floor(100 * Math.pow(1.3, lvl - 1)); }

function updateXPUI() {
    document.getElementById('my-avatar').src = currentUser.avatar;
    document.getElementById('my-name').innerText = currentUser.name;
    const dotColors = { "online": "var(--success-color)", "idle": "var(--warning-color)", "dnd": "var(--danger-color)" };
    document.getElementById('my-status-dot').style.background = dotColors[currentUser.status] || dotColors["online"];
    
    let prestigeStr = currentUser.prestige > 0 ? `[P${currentUser.prestige}] ` : "";
    document.getElementById('my-lvl-text').innerText = `${prestigeStr}Poziom ${currentUser.level}`;
    
    let percent = (currentUser.xp / getXpNeeded(currentUser.level)) * 100;
    document.getElementById('my-xp-bar').style.width = `${percent}%`;
}

function gainXp() {
    currentUser.xp += XP_PER_MSG;
    let needed = getXpNeeded(currentUser.level);
    
    if(currentUser.xp >= needed) {
        currentUser.xp -= needed;
        currentUser.level++;
        if(currentUser.level > 50) { currentUser.level = 1; currentUser.prestige++; showToast(`🏆 Osiągnąłeś PRESTIŻ ${currentUser.prestige}!`, "var(--prestige-gold)"); } 
        else { showToast(`🎉 Awansowałeś na Poziom ${currentUser.level}!`, "var(--brand-color)"); }
        
        mockData.serverRoles[2].users[0].lvl = currentUser.level;
        mockData.serverRoles[2].users[0].prestige = currentUser.prestige;
        if(currentContext === "server") renderRightPanel();
    }
    updateXPUI();
    setDoc(doc(db, 'users', currentUser.uid), currentUser); 
}

function showToast(msg, color) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.style.borderLeftColor = color;
    toast.innerHTML = `<span style="font-size:20px;">⭐</span> <div>${msg}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ================= RENDEROWANIE WIDOKÓW =================
function switchToServer() {
    currentContext = "server";
    document.getElementById('nav-server').classList.add('active');
    document.getElementById('nav-home').classList.remove('active');
    document.getElementById('chat-header-title').innerHTML = `<svg style="color:#80848e; margin-right:8px;"><path d="M21 8.5h-4.5V4h-2v4.5H9.5V4h-2v4.5H3v2h4.5V15H3v2h4.5v4.5h2V17h5v4.5h2V17H21v-2h-4.5v-4.5H21v-2zm-6.5 6.5h-5v-4.5h5v4.5z"/></svg> ogólny`;
    document.getElementById('sidebar-title').innerText = "33MC.PL";
    document.getElementById('sidebar-content').innerHTML = `<div class="category-name">Kanały Tekstowe</div><div class="list-item active"><svg><path d="M21 8.5h-4.5V4h-2v4.5H9.5V4h-2v4.5H3v2h4.5V15H3v2h4.5v4.5h2V17h5v4.5h2V17H21v-2h-4.5v-4.5H21v-2zm-6.5 6.5h-5v-4.5h5v4.5z"/></svg> ogólny</div>`;
    renderMessages(); renderRightPanel();
}

function switchToDM() {
    currentContext = "home";
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('nav-server').classList.remove('active');
    document.getElementById('chat-header-title').innerHTML = `<svg style="color:#80848e; margin-right:8px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg> Znajomi`;
    document.getElementById('sidebar-title').innerText = "Prywatne Wiadomości";
    checkExpiredPosts();
    
    let sb = `<div class="category-name">Znajomi</div>`;
    mockData.friends.forEach(f => {
        const hasPost = f.post ? "has-post" : "";
        const dotColor = { "online": "var(--success-color)", "idle": "var(--warning-color)", "dnd": "var(--danger-color)" }[f.status] || "gray";
        sb += `<div class="list-item"><div class="avatar-container" onclick="window.openPost('${f.id}')"><img src="${f.avatar}" class="list-avatar ${hasPost}"><div class="status-dot" style="background:${dotColor}"></div></div><div>${f.id === "me" ? "Ty" : f.name}</div></div>`;
    });
    document.getElementById('sidebar-content').innerHTML = sb;
    document.getElementById('messages-area').innerHTML = `<div style="padding:16px; border-bottom:1px solid var(--bg-modifier-active);"><h1 style="color:white; font-size:24px;">Wybierz znajomego!</h1><p style="color:var(--text-muted);">Kliknij w avatar z pomarańczową obwódką z lewej strony, by sprawdzić relację.</p></div>`;
    
    let rp = `<div class="role-header">Aktywni Teraz</div>`;
    mockData.friends.forEach(f => { if(f.id !== "me" && f.status === "online") rp += `<div class="member-item"><img src="${f.avatar}" class="member-avatar"><div><h4 style="color:white;">${f.name}</h4><p style="color:var(--success-color); font-size:11px;">Gra na 33MC.PL</p></div></div>`; });
    document.getElementById('right-panel').innerHTML = rp;
}

document.getElementById('nav-server').addEventListener('click', switchToServer);
document.getElementById('nav-home').addEventListener('click', switchToDM);

function renderMessages() {
    let html = "";
    mockData.messages.forEach(m => {
        let badges = `<span class="lvl-badge">Lvl ${m.lvl}</span>`;
        if(m.prestige > 0) badges += ` <span class="prestige-badge">P${m.prestige}</span>`;
        html += `<div class="message"><img src="${m.avatar}" class="msg-avatar"><div class="msg-header"><span class="msg-author">${m.author} ${badges}</span><span class="msg-time">${m.time}</span></div><div class="msg-content">${m.text}</div></div>`;
    });
    const container = document.getElementById('messages-area');
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function renderRightPanel() {
    let rp = "";
    mockData.serverRoles.forEach(role => {
        if(role.users.length > 0) {
            rp += `<div class="role-header">${role.name} - ${role.users.length}</div>`;
            role.users.forEach(u => {
                let badges = `<span class="lvl-badge">Lvl ${u.lvl}</span>`;
                if(u.prestige > 0) badges += `<span class="prestige-badge">P${u.prestige}</span>`;
                rp += `<div class="member-item"><div class="avatar-container" style="margin-right:12px;"><img src="${u.avatar}" class="list-avatar"><div class="status-dot" style="background:${{ "online": "var(--success-color)", "idle": "var(--warning-color)", "dnd": "var(--danger-color)" }[u.status] || 'gray'}"></div></div><div><h4 class="${role.color}">${u.name}</h4><div style="display:flex; gap:5px; margin-top:2px;">${badges}</div></div></div>`;
            });
        }
    });
    document.getElementById('right-panel').innerHTML = rp;
}

document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === "Enter" && this.value.trim() !== "") {
        mockData.messages.push({ author: currentUser.name, avatar: currentUser.avatar, text: this.value.trim(), time: "Przed chwilą", lvl: currentUser.level, prestige: currentUser.prestige });
        this.value = "";
        gainXp(); 
        if (currentContext === "server") renderMessages();
    }
});

// ================= SYSTEM POSTÓW (ZMIANA PO 24H) =================
function checkExpiredPosts() {
    const now = Date.now();
    mockData.friends.forEach(f => {
        if (f.post && f.post.timestamp && (now - f.post.timestamp > TIME_CONSTANTS.ONE_DAY_MS)) {
            f.post = null; 
            if(f.id === "me" && currentUser) { currentUser.post = null; setDoc(doc(db, 'users', currentUser.uid), currentUser); }
        }
    });
}

document.getElementById('post-image-upload').addEventListener('change', (e) => {
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
});

document.getElementById('publish-post').addEventListener('click', async () => {
    const text = document.getElementById('new-post-text').value.trim();
    if(!text && !tempPostImgBase64) return showToast("Wpisz tekst lub dodaj zdjęcie!", "var(--warning-color)");
    
    currentUser.post = { text: text, img: tempPostImgBase64, timestamp: Date.now() };
    await setDoc(doc(db, 'users', currentUser.uid), currentUser);
    mockData.friends[0].post = currentUser.post; 
    
    closeModal('add-post-modal');
    document.getElementById('new-post-text').value = "";
    document.getElementById('post-image-preview').style.display = "none";
    document.getElementById('post-upload-text').style.display = "block";
    tempPostImgBase64 = null;
    
    showToast("Post dodany! Zniknie za 24 godziny.", "var(--success-color)");
    if(currentContext === "home") switchToDM(); 
});

window.openPost = (userId) => {
    const f = mockData.friends.find(x => x.id === userId);
    if(!f || !f.post) return; 
    
    document.getElementById('post-viewer-modal').classList.add('active');
    document.getElementById('post-viewer-avatar').src = f.avatar;
    document.getElementById('post-viewer-name').innerText = f.name === currentUser.name ? "Twój Post" : f.name;
    
    const diffHours = Math.floor((Date.now() - f.post.timestamp) / TIME_CONSTANTS.ONE_HOUR_MS);
    document.getElementById('post-viewer-time').innerText = diffHours === 0 ? "Dodano przed chwilą" : `${diffHours} godz. temu`;
    
    const bgImg = document.getElementById('post-viewer-img');
    if(f.post.img) { bgImg.src = f.post.img; bgImg.style.display = 'block'; } else { bgImg.style.display = 'none'; }
    document.getElementById('post-viewer-text').innerText = f.post.text;
    
    const prog = document.getElementById('post-progress');
    prog.style.transition = "none"; prog.style.width = "0%";
    setTimeout(() => { prog.style.transition = "width 6s linear"; prog.style.width = "100%"; }, 50);
    clearTimeout(postTimer);
    postTimer = setTimeout(() => closeModal('post-viewer-modal'), 6000);
};

// ================= MODALE =================
function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
    if(id === 'settings-modal') {
        document.getElementById('edit-name').value = currentUser.name;
        document.getElementById('edit-status').value = currentUser.status;
        document.getElementById('settings-avatar-preview').src = currentUser.avatar;
        tempAvatarBase64 = currentUser.avatar;
    }
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); clearTimeout(postTimer); }

document.getElementById('btn-add-post').addEventListener('click', () => openModal('add-post-modal'));
document.getElementById('btn-settings').addEventListener('click', () => openModal('settings-modal'));
document.getElementById('btn-open-settings').addEventListener('click', () => openModal('settings-modal'));

document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', function() { closeModal(this.closest('.modal-overlay').id); }));

document.getElementById('avatar-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) { const r = new FileReader(); r.onload = (ev) => { tempAvatarBase64 = ev.target.result; document.getElementById('settings-avatar-preview').src = tempAvatarBase64; }; r.readAsDataURL(file); }
});

document.getElementById('save-settings').addEventListener('click', async () => {
    document.getElementById('save-settings').innerText = "Zapisywanie...";
    currentUser.name = document.getElementById('edit-name').value;
    currentUser.status = document.getElementById('edit-status').value;
    currentUser.avatar = tempAvatarBase64;
    
    await setDoc(doc(db, 'users', currentUser.uid), currentUser);
    mockData.friends[0].name = currentUser.name; mockData.friends[0].avatar = currentUser.avatar; mockData.friends[0].status = currentUser.status;
    mockData.serverRoles[2].users[0].name = currentUser.name; mockData.serverRoles[2].users[0].avatar = currentUser.avatar; mockData.serverRoles[2].users[0].status = currentUser.status;
    
    updateXPUI(); closeModal('settings-modal');
    document.getElementById('save-settings').innerText = "Zapisz Zmiany";
    showToast("Profil zaktualizowany!", "var(--success-color)");
    if(currentContext === "home") switchToDM(); else switchToServer();
});
