// ================= BAZA DANYCH (MOCK DB) =================
// Ten plik symuluje dane z zewnętrznego serwera.

export const TIME_CONSTANTS = {
    ONE_DAY_MS: 24 * 60 * 60 * 1000, // 24 godziny w milisekundach
    ONE_HOUR_MS: 60 * 60 * 1000
};

export const mockData = {
    // 1. ZNAJOMI I ICH RELACJE (POSTY)
    friends: [
        { 
            id: "f1", 
            name: "Anna Nowak", 
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna", 
            status: "online",
            post: { 
                text: "Piszę nowy kod w HTML/CSS! 💻", 
                img: null, 
                // Ten post ma 2 godziny, więc będzie widoczny z pomarańczową obwódką
                timestamp: Date.now() - (2 * TIME_CONSTANTS.ONE_HOUR_MS) 
            } 
        },
        { 
            id: "f2", 
            name: "Blaaqu", 
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", 
            status: "idle",
            post: null // Brak posta
        },
        { 
            id: "f3", 
            name: "xPatrysiak", 
            avatar: "https://api.dicebear.com/7.x/bot/svg?seed=Patryk", 
            status: "dnd",
            post: { 
                text: "Stary post (Zignoruj)", 
                img: null, 
                // Ten post ma 25 godzin. Logika go usunie!
                timestamp: Date.now() - (25 * TIME_CONSTANTS.ONE_HOUR_MS) 
            } 
        },
        { 
            id: "f4", 
            name: "Kamil", 
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kamil", 
            status: "offline",
            post: null
        }
    ],

    // 2. ROLE I CZŁONKOWIE NA SERWERZE
    serverRoles: [
        { 
            name: "Właściciel", 
            color: "role-owner", 
            users: [
                { name: "Blaaqu", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", lvl: 150, prestige: 3, status: "idle" }
            ] 
        },
        { 
            name: "VIP", 
            color: "role-vip", 
            users: [
                { name: "Anna Nowak", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna", lvl: 45, prestige: 0, status: "online" }
            ] 
        },
        { 
            name: "Użytkownicy", 
            color: "", 
            users: [] // Tutaj dynamicznie wpadnie zalogowany gracz
        } 
    ],

    // 3. HISTORIA WIADOMOŚCI (Kanał Ogólny)
    messages: [
        { 
            author: "System", 
            avatar: "https://api.dicebear.com/7.x/bot/svg?seed=System", 
            text: "Witaj na serwerze 33MC.PL! Zapoznaj się z regulaminem.", 
            time: "Wczoraj o 12:00", 
            lvl: 999, 
            prestige: 9 
        },
        { 
            author: "Blaaqu", 
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", 
            text: "Jak idzie kodowanie nowego Discorda?", 
            time: "Dzisiaj o 10:15", 
            lvl: 150, 
            prestige: 3 
        }
    ]
};
