import { UserProfile, Task, Reminder, Note, MoodEntry, GalleryItem, AppData, Message } from '../types';

const DB_KEY = 'rio_secure_db_v1';
const CURRENT_USER_KEY = 'rio_active_session';
const MESSAGES_KEY = 'rio_messages_bus_v1';
const RIO_BOT_ID = 'rio-official-bot';

// Simple obfuscation/encryption simulation for client-side demo
// In a real app, this would be a proper backend or Web Crypto API implementation
const encrypt = (data: any): string => {
    try {
        const str = JSON.stringify(data);
        return btoa(encodeURIComponent(str));
    } catch (e) {
        console.error("Encryption failed", e);
        return "";
    }
};

const decrypt = (data: string): any => {
    try {
        if (!data) return null;
        const str = decodeURIComponent(atob(data));
        return JSON.parse(str);
    } catch (e) {
        console.error("Decryption failed", e);
        return null;
    }
};

export const StorageService = {
    // --- Database Initialization ---
    initializeDatabase: () => {
        const users = StorageService.getUsers();
        // Create the Rio Bot if it doesn't exist
        if (!users.find(u => u.id === RIO_BOT_ID)) {
             const rioBot: UserProfile & { password: string } = {
                id: RIO_BOT_ID,
                username: 'RioBot',
                name: 'Rio AI',
                email: 'rio@rio.ai',
                password: 'admin-bot-secure', 
                inviteCode: 'RIO-AI',
                isAdultMode: false,
                isHandsFree: false,
                setupComplete: true,
                theme: { primaryColor: 'blue', fontFamily: 'sans', cardStyle: 'glass' },
                widgets: { showVisualizer: true, showMood: true, showSources: true, showGreeting: true }
             };
             // We use the internal save method to avoid session overwrites
             users.push({ ...rioBot, data: { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [] } });
             localStorage.setItem(DB_KEY, encrypt(users));
             
             // Add a welcome message to the bus
             const welcomeMsg: Message = {
                 id: 'welcome-msg-1',
                 senderId: RIO_BOT_ID,
                 receiverId: 'global', // Broadcast concept (not fully impl, but good for placeholder)
                 content: "Welcome to Rio! Add me as a friend using code: RIO-AI",
                 type: 'text',
                 timestamp: Date.now(),
                 read: false
             };
             // We don't push to global bus yet to avoid clutter, but the bot exists now.
        }
    },

    // --- User Management ---
    
    getUsers: (): (UserProfile & { password: string, data: AppData })[] => {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) return [];
        return decrypt(raw) || [];
    },

    getUserPublicProfile: (userId: string): UserProfile | null => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            const { password, data, ...profile } = user;
            return profile;
        }
        return null;
    },

    findUserByUsername: (username: string): UserProfile | null => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            const { password, data, ...profile } = user;
            return profile;
        }
        return null;
    },

    findUserByEmail: (email: string): UserProfile | null => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            const { password, data, ...profile } = user;
            return profile;
        }
        return null;
    },

    findUserByInviteCode: (code: string): UserProfile | null => {
        const users = StorageService.getUsers();
        // Case insensitive check for invite code
        const user = users.find(u => u.inviteCode && u.inviteCode.toUpperCase() === code.toUpperCase());
        if (user) {
            const { password, data, ...profile } = user;
            return profile;
        }
        return null;
    },

    updatePassword: (userId: string, newPassword: string) => {
        const users = StorageService.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].password = newPassword;
            localStorage.setItem(DB_KEY, encrypt(users));
        }
    },

    saveUser: (user: UserProfile & { password?: string }, data?: AppData) => {
        const users = StorageService.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        
        // Prepare payload
        const userData: any = { ...user };
        
        // Ensure invite code exists
        if (!userData.inviteCode) {
            userData.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        // If updating an existing user, preserve password and data if not provided
        if (index !== -1) {
            if (!userData.password) userData.password = users[index].password;
            
            // Preserve existing invite code if current object is missing it (rare edge case with partial updates)
            if (!userData.inviteCode && users[index].inviteCode) {
                userData.inviteCode = users[index].inviteCode;
            }

            userData.data = data || users[index].data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [] };
            users[index] = userData;
        } else {
            // New User
            if (!userData.password) throw new Error("Password required for new user");
            userData.data = data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [] };
            users.push(userData);
        }

        localStorage.setItem(DB_KEY, encrypt(users));
        
        // If this is the currently logged in user, update session
        const currentSession = StorageService.getSession();
        if (currentSession && currentSession.id === user.id) {
            localStorage.setItem(CURRENT_USER_KEY, encrypt(userData)); // Update session with new fields (like inviteCode)
        }
    },

    // --- Authentication ---

    login: (identifier: string, password: string): { user: UserProfile, data: AppData } | null => {
        const users = StorageService.getUsers();
        const found = users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
        
        if (found) {
            const { password: _, data, ...profile } = found;
            localStorage.setItem(CURRENT_USER_KEY, encrypt(profile));
            // Ensure friends array exists for legacy users
            if (!data.friends) data.friends = [];
            return { user: profile, data: data };
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    getSession: (): UserProfile | null => {
        const raw = localStorage.getItem(CURRENT_USER_KEY);
        return raw ? decrypt(raw) : null;
    },

    // --- Data Access ---
    
    // Efficiently load all data for the current user
    loadUserData: (userId: string): AppData => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.id === userId);
        if (user && user.data) {
            if (!user.data.friends) user.data.friends = [];
            return user.data;
        }
        return { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [] };
    },

    // Save specific data slice
    saveData: (userId: string, type: keyof AppData, items: any[]) => {
        const users = StorageService.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            if (!users[index].data) {
                users[index].data = { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [] };
            }
            // @ts-ignore
            users[index].data[type] = items;
            localStorage.setItem(DB_KEY, encrypt(users));
        }
    },

    // --- Messaging System (Global Bus) ---
    // Stored separately so messages persist across user switches easily

    getAllMessages: (): Message[] => {
        const raw = localStorage.getItem(MESSAGES_KEY);
        return raw ? decrypt(raw) || [] : [];
    },

    getConversation: (user1Id: string, user2Id: string): Message[] => {
        const all = StorageService.getAllMessages();
        return all.filter(m => 
            (m.senderId === user1Id && m.receiverId === user2Id) || 
            (m.senderId === user2Id && m.receiverId === user1Id)
        ).sort((a, b) => a.timestamp - b.timestamp);
    },

    sendMessage: (msg: Message) => {
        const all = StorageService.getAllMessages();
        all.push(msg);
        localStorage.setItem(MESSAGES_KEY, encrypt(all));

        // BOT SIMULATION
        // If sending to the bot, trigger an automatic reply
        if (msg.receiverId === RIO_BOT_ID) {
            setTimeout(() => {
                const replies = [
                    "I'm Rio, your AI friend! 🤖",
                    "That's interesting! Tell me more.",
                    "I am currently a simulated user in this database.",
                    "Beep boop. I received your message!",
                    "You can talk to me via voice in the main tab too!"
                ];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                
                const botReply: Message = {
                    id: Date.now().toString() + '-bot',
                    senderId: RIO_BOT_ID,
                    receiverId: msg.senderId,
                    content: randomReply,
                    type: 'text',
                    timestamp: Date.now(),
                    read: false
                };
                
                // Refresh list as it might have changed
                const currentAll = StorageService.getAllMessages();
                currentAll.push(botReply);
                localStorage.setItem(MESSAGES_KEY, encrypt(currentAll));
            }, 1500);
        }
    },
    
    // Migration helper for older localstorage format
    migrate: () => {
        const legacyUser = localStorage.getItem('vibe_user');
        if (legacyUser && !localStorage.getItem(DB_KEY)) {
            console.log("Migrating legacy data to Secure DB...");
            const user = JSON.parse(legacyUser);
            const data: AppData = {
                tasks: JSON.parse(localStorage.getItem('vibe_tasks') || '[]'),
                reminders: JSON.parse(localStorage.getItem('vibe_reminders') || '[]'),
                notes: JSON.parse(localStorage.getItem('vibe_notes') || '[]'),
                moods: JSON.parse(localStorage.getItem('vibe_moods') || '[]'),
                gallery: JSON.parse(localStorage.getItem('vibe_gallery') || '[]'),
                friends: []
            };
            
            // Create a default password for migrated user since we didn't have one before
            StorageService.saveUser({ ...user, password: 'password' }, data);
            
            // Clean up legacy
            localStorage.removeItem('vibe_user');
            localStorage.removeItem('vibe_tasks');
            localStorage.removeItem('vibe_reminders');
            localStorage.removeItem('vibe_notes');
            localStorage.removeItem('vibe_moods');
            localStorage.removeItem('vibe_gallery');
            localStorage.removeItem('vibe_users_db'); 
        }
    }
};