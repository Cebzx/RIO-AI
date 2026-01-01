import { UserProfile, Task, Reminder, Note, MoodEntry, GalleryItem, AppData, Message, FriendRequest } from '../types';

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
             users.push({ ...rioBot, data: { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] } });
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

    // Return list of users excluding the current user, already added friends, and blocked users
    getSuggestedFriends: (currentUserId: string, friendIds: string[], blockedIds: string[] = []): UserProfile[] => {
        const users = StorageService.getUsers();
        return users
            .filter(u => u.id !== currentUserId && !friendIds.includes(u.id) && !blockedIds.includes(u.id))
            .map(u => {
                const { password, data, ...profile } = u;
                return profile;
            })
            .slice(0, 5); // Limit to 5 suggestions
    },

    findUserByUsername: (username: string): UserProfile | null => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            const { password, data, ...profile } = user;
            return profile;
        }
        return null;
    },

    findUserByEmail: (email: string): UserProfile | null => {
        const users = StorageService.getUsers();
        const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
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

            userData.data = data || users[index].data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
            users[index] = userData;
        } else {
            // New User
            if (!userData.password) throw new Error("Password required for new user");
            userData.data = data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
            users.push(userData);
        }

        localStorage.setItem(DB_KEY, encrypt(users));
        
        // If this is the currently logged in user, update session
        const currentSession = StorageService.getSession();
        if (currentSession && currentSession.id === user.id) {
            localStorage.setItem(CURRENT_USER_KEY, encrypt(userData)); // Update session with new fields (like inviteCode)
        }
    },

    // --- Friend Requests & Blocking ---

    sendFriendRequest: (senderId: string, receiverId: string) => {
        const users = StorageService.getUsers();
        const receiverIndex = users.findIndex(u => u.id === receiverId);
        if (receiverIndex === -1) return false;

        const receiverData = users[receiverIndex].data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
        
        // Check if already friends or blocked
        if (receiverData.friends.includes(senderId) || receiverData.blockedUsers?.includes(senderId)) return false;
        
        // Check if request already exists
        if (receiverData.friendRequests?.find(r => r.senderId === senderId)) return false;

        // Ensure array exists
        if (!receiverData.friendRequests) receiverData.friendRequests = [];

        // Special Case: Auto-accept if sending TO RioBot
        if (receiverId === RIO_BOT_ID) {
            // Add sender to Bot's friends
            receiverData.friends.push(senderId);
            users[receiverIndex].data = receiverData;
            
            // Add Bot to sender's friends
            const senderIndex = users.findIndex(u => u.id === senderId);
            if (senderIndex !== -1) {
                const senderData = users[senderIndex].data || { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
                if (!senderData.friends) senderData.friends = [];
                senderData.friends.push(RIO_BOT_ID);
                users[senderIndex].data = senderData;
            }
        } else {
            // Normal Request
            receiverData.friendRequests.push({ senderId, timestamp: Date.now() });
            users[receiverIndex].data = receiverData;
        }

        localStorage.setItem(DB_KEY, encrypt(users));
        return true;
    },

    acceptFriendRequest: (userId: string, senderId: string) => {
        const users = StorageService.getUsers();
        
        const userIndex = users.findIndex(u => u.id === userId);
        const senderIndex = users.findIndex(u => u.id === senderId);

        if (userIndex === -1 || senderIndex === -1) return false;

        // Update User (Receiver)
        const userData = users[userIndex].data!;
        userData.friendRequests = userData.friendRequests.filter(r => r.senderId !== senderId);
        if (!userData.friends.includes(senderId)) userData.friends.push(senderId);
        users[userIndex].data = userData;

        // Update Sender
        const senderData = users[senderIndex].data!;
        if (!senderData.friends.includes(userId)) senderData.friends.push(userId);
        users[senderIndex].data = senderData;

        localStorage.setItem(DB_KEY, encrypt(users));
        return true;
    },

    declineFriendRequest: (userId: string, senderId: string) => {
        const users = StorageService.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return false;

        const userData = users[userIndex].data!;
        userData.friendRequests = userData.friendRequests.filter(r => r.senderId !== senderId);
        users[userIndex].data = userData;

        localStorage.setItem(DB_KEY, encrypt(users));
        return true;
    },

    blockUser: (userId: string, targetId: string) => {
        const users = StorageService.getUsers();
        
        const userIndex = users.findIndex(u => u.id === userId);
        const targetIndex = users.findIndex(u => u.id === targetId);

        if (userIndex === -1) return false;

        // Update User: Remove friend, Add block
        const userData = users[userIndex].data!;
        userData.friends = userData.friends.filter(id => id !== targetId);
        // Remove pending requests if any
        userData.friendRequests = userData.friendRequests?.filter(r => r.senderId !== targetId) || [];
        
        if (!userData.blockedUsers) userData.blockedUsers = [];
        if (!userData.blockedUsers.includes(targetId)) userData.blockedUsers.push(targetId);
        users[userIndex].data = userData;

        // Update Target: Remove friend (reciprocal removal)
        // We do NOT tell the target they are blocked, but we remove the friendship.
        if (targetIndex !== -1) {
            const targetData = users[targetIndex].data!;
            targetData.friends = targetData.friends.filter(id => id !== userId);
            users[targetIndex].data = targetData;
        }

        localStorage.setItem(DB_KEY, encrypt(users));
        return true;
    },

    // --- Authentication ---

    login: (identifier: string, password: string): { user: UserProfile, data: AppData } | null => {
        const users = StorageService.getUsers();
        const found = users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
        
        if (found) {
            const { password: _, data, ...profile } = found;
            localStorage.setItem(CURRENT_USER_KEY, encrypt(profile));
            // Ensure data integrity
            if (!data.friends) data.friends = [];
            if (!data.friendRequests) data.friendRequests = [];
            if (!data.blockedUsers) data.blockedUsers = [];
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
            // Robust initialization to prevent undefined errors
            if (!user.data.friends) user.data.friends = [];
            if (!user.data.friendRequests) user.data.friendRequests = [];
            if (!user.data.blockedUsers) user.data.blockedUsers = [];
            if (!user.data.tasks) user.data.tasks = [];
            if (!user.data.reminders) user.data.reminders = [];
            if (!user.data.notes) user.data.notes = [];
            if (!user.data.moods) user.data.moods = [];
            if (!user.data.gallery) user.data.gallery = [];
            return user.data;
        }
        return { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
    },

    // Save specific data slice
    saveData: (userId: string, type: keyof AppData, items: any[]) => {
        const users = StorageService.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            if (!users[index].data) {
                users[index].data = { tasks: [], reminders: [], notes: [], moods: [], gallery: [], friends: [], friendRequests: [], blockedUsers: [] };
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
            // ... legacy code
        }
    }
};