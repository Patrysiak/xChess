// Baza danych symulująca zewnętrzny serwer Firestore przed pełną synchronizacją.
export const TIME_CONSTANTS = { ONE_DAY_MS: 24 * 60 * 60 * 1000, ONE_HOUR_MS: 60 * 60 * 1000 };

export const mockData = {
    friends: [
        { id: "f1", name: "Anna Nowak", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna", status: "online", post: { text: "Piszę kod! 💻", img: null, timestamp: Date.now() - (2 * TIME_CONSTANTS.ONE_HOUR_MS) } },
        { id: "f2", name: "Blaaqu", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", status: "idle", post: null },
        { id: "f3", name: "xPatrysiak", avatar: "https://api.dicebear.com/7.x/bot/svg?seed=Patryk", status: "dnd", post: { text: "To zniknie (stare)", img: null, timestamp: Date.now() - (25 * TIME_CONSTANTS.ONE_HOUR_MS) } },
        { id: "f4", name: "Kamil", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kamil", status: "offline", post: null },
        { id: "f5", name: "Dawid", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dawid", status: "online", post: { text: "Wbijam na 33MC.PL! 🔥", img: null, timestamp: Date.now() - (5 * TIME_CONSTANTS.ONE_HOUR_MS) } }
    ],
    serverRoles: [
        { name: "Zarząd", color: "role-owner", users: [{ name: "Blaaqu", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", lvl: 150, prestige: 5, status: "dnd" }] },
        { name: "VIP", color: "role-vip", users: [{ name: "Anna Nowak", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna", lvl: 45, prestige: 0, status: "online" }] },
        { name: "Gracze", color: "", users: [] }
    ],
    messages: [
        { author: "System", avatar: "https://api.dicebear.com/7.x/bot/svg?seed=System", text: "Witaj na serwerze! Napisz coś, aby zdobyć pierwsze punkty XP.", time: "Wczoraj o 12:00", lvl: 999, prestige: 9 },
        { author: "Blaaqu", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blaaqu", text: "Siema, działa wam najnowszy kod?", time: "Dzisiaj o 10:15", lvl: 150, prestige: 5 }
    ]
};
