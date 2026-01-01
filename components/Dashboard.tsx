import React, { useState, useEffect, useRef } from 'react';
import { Task, Reminder, Note, MoodEntry, UserProfile, LiveStatus, ThemeColor, ThemePreferences, GalleryItem, MediaContent, Message } from '../types';
import Visualizer from './Visualizer';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SpotifyService } from '../services/spotifyService';
import { StorageService } from '../services/storage';
import SnowEffect from './SnowEffect';

interface DashboardProps {
  user: UserProfile;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  moodHistory: MoodEntry[];
  setMoodHistory: React.Dispatch<React.SetStateAction<MoodEntry[]>>;
  gallery: GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
}

// Helper to get tailwind classes based on theme
const getThemeStyles = (theme: ThemePreferences) => {
    const colors: Record<ThemeColor, any> = {
        blue: {
            bg: 'bg-blue-500',
            bgSoft: 'bg-blue-500/10',
            text: 'text-blue-400',
            textDark: 'text-blue-500',
            border: 'border-blue-500/50',
            glow: 'shadow-blue-500/20',
            gradient: 'from-cyan-500 via-blue-500 to-purple-600',
            ring: 'ring-blue-500',
            hoverBg: 'hover:bg-blue-500/20'
        },
        purple: {
            bg: 'bg-purple-600',
            bgSoft: 'bg-purple-500/10',
            text: 'text-purple-400',
            textDark: 'text-purple-500',
            border: 'border-purple-500/50',
            glow: 'shadow-purple-500/20',
            gradient: 'from-purple-500 via-fuchsia-500 to-pink-600',
            ring: 'ring-purple-500',
            hoverBg: 'hover:bg-purple-500/20'
        },
        green: {
            bg: 'bg-emerald-500',
            bgSoft: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            textDark: 'text-emerald-500',
            border: 'border-emerald-500/50',
            glow: 'shadow-emerald-500/20',
            gradient: 'from-emerald-400 via-green-500 to-teal-600',
            ring: 'ring-emerald-500',
            hoverBg: 'hover:bg-emerald-500/20'
        },
        orange: {
            bg: 'bg-orange-500',
            bgSoft: 'bg-orange-500/10',
            text: 'text-orange-400',
            textDark: 'text-orange-500',
            border: 'border-orange-500/50',
            glow: 'shadow-orange-500/20',
            gradient: 'from-yellow-500 via-orange-500 to-red-600',
            ring: 'ring-orange-500',
            hoverBg: 'hover:bg-orange-500/20'
        },
        rose: {
            bg: 'bg-rose-500',
            bgSoft: 'bg-rose-500/10',
            text: 'text-rose-400',
            textDark: 'text-rose-500',
            border: 'border-rose-500/50',
            glow: 'shadow-rose-500/20',
            gradient: 'from-rose-400 via-pink-500 to-purple-600',
            ring: 'ring-rose-500',
            hoverBg: 'hover:bg-rose-500/20'
        }
    };

    const cardStyles = {
        glass: 'glass-card backdrop-blur-xl border border-white/10 bg-zinc-900/60',
        solid: 'bg-zinc-900 border border-zinc-800 shadow-xl',
        minimal: 'border border-zinc-800 bg-black/40',
    };

    return {
        colors: colors[theme.primaryColor],
        card: cardStyles[theme.cardStyle],
    };
};

const Dashboard: React.FC<DashboardProps> = ({
    user,
    tasks, setTasks,
    reminders, setReminders,
    notes, setNotes,
    moodHistory, setMoodHistory,
    gallery, setGallery,
    onUpdateUser,
    onLogout
}) => {
    const themeStyles = getThemeStyles(user.theme);
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notes' | 'social' | 'mood' | 'gallery' | 'profile' | 'settings'>('overview');
    const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // --- Camera State ---
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // --- Social State ---
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<UserProfile[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [addFriendInput, setAddFriendInput] = useState('');
    const [addFriendError, setAddFriendError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate Invite Code if missing for existing users
    useEffect(() => {
        if (!user.inviteCode) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            onUpdateUser({ inviteCode: newCode });
        }
    }, [user.inviteCode, onUpdateUser]);

    // Initial Load of Friends and Suggestions
    useEffect(() => {
        const storedData = StorageService.loadUserData(user.id);
        const storedFriendIds = storedData.friends || [];
        setFriendIds(storedFriendIds);

        // Hydrate friend profiles
        const profiles = storedFriendIds
            .map(id => StorageService.getUserPublicProfile(id))
            .filter(p => p !== null) as UserProfile[];
        setFriends(profiles);
        
        // Load Suggestions
        setSuggestedFriends(StorageService.getSuggestedFriends(user.id, storedFriendIds));

    }, [user.id, activeTab]); // Reload suggestions when tab changes

    // Poll for messages (simulation of realtime)
    useEffect(() => {
        if (!activeChatId) return;
        
        const poll = setInterval(() => {
            const msgs = StorageService.getConversation(user.id, activeChatId);
            // Only update if length changed to prevent jitter, though in React 18 this is fine
            setMessages(prev => msgs.length !== prev.length ? msgs : prev);
        }, 1000);

        return () => clearInterval(poll);
    }, [activeChatId, user.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const executeAddFriend = (targetUser: UserProfile) => {
        if (friendIds.includes(targetUser.id)) {
            setAddFriendError("Already friends!");
            return;
        }
        const newIds = [...friendIds, targetUser.id];
        setFriendIds(newIds);
        setFriends(prev => [...prev, targetUser]);
        
        // Update DB
        StorageService.saveData(user.id, 'friends', newIds);
        
        // Update suggestions
        setSuggestedFriends(prev => prev.filter(u => u.id !== targetUser.id));

        setAddFriendInput('');
        setAddFriendError('');
        alert(`Added ${targetUser.username} to your friends!`);
    };

    const handleAddFriend = () => {
        const input = addFriendInput.trim();
        if (!input) return;
        
        // Prevent adding self by username or own invite code or email
        if (input.toLowerCase() === user.username.toLowerCase() || 
            input.toUpperCase() === user.inviteCode?.toUpperCase() ||
            input.toLowerCase() === user.email.toLowerCase()) {
            setAddFriendError("You can't add yourself!");
            return;
        }

        // Search by Username OR Invite Code OR Email
        let foundUser = StorageService.findUserByUsername(input);
        if (!foundUser) {
            foundUser = StorageService.findUserByInviteCode(input);
        }
        if (!foundUser) {
            foundUser = StorageService.findUserByEmail(input);
        }

        if (foundUser) {
            executeAddFriend(foundUser);
        } else {
            setAddFriendError("User not found (Check Username, Code, or Email)");
        }
    };

    const handleSendMessage = () => {
        if ((!messageInput.trim()) || !activeChatId) return;
        
        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: user.id,
            receiverId: activeChatId,
            content: messageInput,
            type: 'text',
            timestamp: Date.now(),
            read: false
        };

        StorageService.sendMessage(newMessage);
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeChatId) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const newMessage: Message = {
                    id: Date.now().toString(),
                    senderId: user.id,
                    receiverId: activeChatId,
                    content: base64String, // Store image data in content
                    type: 'image',
                    timestamp: Date.now(),
                    read: false
                };
                StorageService.sendMessage(newMessage);
                setMessages(prev => [...prev, newMessage]);
            };
            reader.readAsDataURL(file);
        }
    };

    // Camera Handlers
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setShowCamera(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const captureAndSend = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const base64Data = dataUrl.split(',')[1];
                sendImage(base64Data);
                stopCamera();
                // Optionally give feedback
                alert("Image sent to Rio! Ask your question.");
            }
        }
    };

    // Handlers for Gemini Tools
    const handleTaskAction = async (action: string, title?: string, searchTerm?: string) => {
        if (action === 'create' && title) {
            const newTask: Task = {
                id: Date.now().toString(),
                title,
                completed: false,
                createdAt: Date.now()
            };
            setTasks(prev => [newTask, ...prev]);
            return `Task "${title}" created.`;
        } else if (action === 'complete') {
            const term = searchTerm?.toLowerCase() || title?.toLowerCase();
            if (!term) return "Please specify which task to complete.";
            
            let found = false;
            setTasks(prev => prev.map(t => {
                if (!t.completed && t.title.toLowerCase().includes(term)) {
                    found = true;
                    return { ...t, completed: true };
                }
                return t;
            }));
            return found ? "Task marked as complete." : "Task not found.";
        } else if (action === 'delete') {
             const term = searchTerm?.toLowerCase() || title?.toLowerCase();
             if (!term) return "Please specify which task to delete.";
             setTasks(prev => prev.filter(t => !t.title.toLowerCase().includes(term)));
             return "Task deleted.";
        }
        return "Task action not recognized.";
    };

    const handleReminderAction = async (action: string, title?: string, searchTerm?: string) => {
        if (action === 'create' && title) {
            const newReminder: Reminder = {
                id: Date.now().toString(),
                title,
                completed: false,
                createdAt: Date.now()
            };
            setReminders(prev => [newReminder, ...prev]);
            return `Reminder "${title}" set.`;
        } else if (action === 'complete') {
             const term = searchTerm?.toLowerCase() || title?.toLowerCase();
             if (!term) return "Please specify which reminder.";
             setReminders(prev => prev.map(r => r.title.toLowerCase().includes(term) ? {...r, completed: true} : r));
             return "Reminder completed.";
        } else if (action === 'delete') {
            const term = searchTerm?.toLowerCase() || title?.toLowerCase();
             if (!term) return "Please specify which reminder.";
             setReminders(prev => prev.filter(r => !r.title.toLowerCase().includes(term)));
             return "Reminder deleted.";
        }
        return "Reminder action failed.";
    };

    const handleNoteAction = async (action: string, content?: string) => {
        if (action === 'create' && content) {
            const newNote: Note = {
                id: Date.now().toString(),
                content,
                createdAt: Date.now()
            };
            setNotes(prev => [newNote, ...prev]);
            return "Note saved.";
        } else if (action === 'delete') {
            // Simplified delete: delete last or find by content match (naive)
            if (content) {
                 setNotes(prev => prev.filter(n => !n.content.toLowerCase().includes(content.toLowerCase())));
                 return "Note deleted.";
            }
             return "Please specify content to delete note.";
        }
        return "Note action failed.";
    };

    const handleMoodAction = async (score: number, notesStr?: string) => {
        const entry: MoodEntry = {
            id: Date.now().toString(),
            score,
            notes: notesStr || '',
            timestamp: Date.now()
        };
        setMoodHistory(prev => [...prev, entry]);
        return `Mood logged: ${score}/5.`;
    };

    const handleSpotifyAction = (result: any) => {
        console.log("Spotify Action Result:", result);
    };

    const { 
        connect, 
        disconnect, 
        status, 
        isSpeaking, 
        volume, 
        outputVolume, 
        setOutputVolume,
        sources,
        mediaContent,
        sendImage
    } = useGeminiLive({
        userProfile: user,
        tasks,
        reminders,
        notes,
        spotifyDeviceId,
        onTaskAction: handleTaskAction,
        onReminderAction: handleReminderAction,
        onNoteAction: handleNoteAction,
        onMoodAction: handleMoodAction,
        onSpotifyAction: handleSpotifyAction
    });

    // Handle Media Content updates from Gemini
    useEffect(() => {
        if (mediaContent) {
            if (mediaContent.type === 'image' && mediaContent.url) {
                setGallery(prev => [
                    { id: Date.now().toString(), data: mediaContent.url!, timestamp: Date.now() }, 
                    ...prev
                ]);
            }
        }
    }, [mediaContent]);

    // Spotify Auth Check
    useEffect(() => {
        const hashParams = SpotifyService.getTokenFromUrl();
        if (hashParams) {
            onUpdateUser({ 
                spotify: { 
                    accessToken: hashParams.accessToken, 
                    expirationTime: Date.now() + parseInt(hashParams.expiresIn) * 1000 
                } 
            });
            window.location.hash = '';
        }
    }, []);

    // Render Logic
    return (
        <div className="min-h-screen relative flex flex-col md:flex-row transition-colors duration-500 overflow-hidden"
             style={{
                 backgroundImage: user.theme.backgroundImage ? `url(${user.theme.backgroundImage})` : undefined,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center'
             }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
            <SnowEffect />

            {/* Main Layout */}
            <div className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
                   <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themeStyles.colors.gradient} flex items-center justify-center shadow-lg`}>
                           <span className="font-bold text-white text-sm">R</span>
                       </div>
                       <h1 className="text-xl font-bold tracking-tight text-white/90">Rio <span className="text-white/40 font-normal text-sm">| {user.name}</span></h1>
                   </div>
                   <div className="flex items-center gap-4">
                       <div className="text-xs text-white/60 hidden md:block">
                           {status === 'connected' ? (
                               <span className="flex items-center gap-1.5 text-emerald-400">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                   Live
                               </span>
                           ) : (
                               <span className="flex items-center gap-1.5">
                                   <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                   Offline
                               </span>
                           )}
                       </div>
                       <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       </button>
                   </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Panel: Visualizer & Controls */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Visualizer Card */}
                        <div className={`relative ${themeStyles.card} rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] overflow-hidden group`}>
                             {showCamera ? (
                                 <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-30">
                                     <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                                     <canvas ref={canvasRef} className="hidden" />
                                     
                                     {/* Camera Controls Overlay */}
                                     <div className="absolute bottom-6 flex gap-4 z-40">
                                        <button 
                                            onClick={stopCamera}
                                            className="px-6 py-3 rounded-full bg-red-500/20 text-red-400 backdrop-blur-md border border-red-500/40 hover:bg-red-500/40 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={captureAndSend}
                                            className="w-16 h-16 rounded-full bg-white border-4 border-zinc-300 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white border-2 border-black"></div>
                                        </button>
                                     </div>
                                 </div>
                             ) : (
                                <>
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        {status === 'connected' && (
                                            <button 
                                                onClick={startCamera}
                                                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
                                                title="Show Rio something"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                        )}
                                        {status === 'disconnected' || status === 'error' || status === 'connecting' ? (
                                            <button 
                                                onClick={connect}
                                                disabled={status === 'connecting'}
                                                className={`px-6 py-2 rounded-full font-medium text-sm transition-all shadow-lg ${status === 'connecting' ? 'bg-zinc-700 text-zinc-400' : 'bg-white text-black hover:bg-zinc-200 hover:scale-105'}`}
                                            >
                                                {status === 'connecting' ? 'Connecting...' : 'Start Session'}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={disconnect}
                                                className="px-6 py-2 rounded-full font-medium text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                                            >
                                                End Session
                                            </button>
                                        )}
                                    </div>
                                    
                                    <Visualizer 
                                        volume={volume}
                                        isActive={status === 'connected'}
                                        isSpeaking={isSpeaking}
                                    />

                                    {/* Media Display Overlay */}
                                    {mediaContent && (
                                        <div className="absolute inset-x-4 bottom-4 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in-up">
                                            <h4 className="text-xs uppercase tracking-wider text-white/50 mb-1">{mediaContent.type}</h4>
                                            {mediaContent.type === 'text' && <p className="text-white text-sm">{mediaContent.content}</p>}
                                            {mediaContent.type === 'image' && <img src={mediaContent.url} alt="Generated" className="w-full h-32 object-cover rounded-lg" />}
                                            {mediaContent.title && <p className="text-white font-medium text-sm mt-1">{mediaContent.title}</p>}
                                        </div>
                                    )}
                                </>
                             )}
                        </div>
                        
                        {/* Status/Sources */}
                        {sources.length > 0 && (
                            <div className={`${themeStyles.card} rounded-2xl p-4`}>
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Sources & References</h3>
                                <div className="space-y-2">
                                    {sources.map((s, i) => (
                                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block text-sm text-blue-400 hover:text-blue-300 truncate transition-colors">
                                            {s.title || s.uri}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Dashboard Widgets */}
                    <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden">
                        
                        {/* Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                { id: 'overview', label: 'Overview' },
                                { id: 'social', label: 'Social' },
                                { id: 'tasks', label: 'Tasks' },
                                { id: 'notes', label: 'Notes' },
                                { id: 'mood', label: 'Mood' },
                                { id: 'gallery', label: 'Gallery' },
                                { id: 'profile', label: 'Profile' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            
                            {/* OVERVIEW */}
                            {activeTab === 'overview' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Task Summary */}
                                        <div className={`${themeStyles.card} rounded-2xl p-5`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-semibold text-white">Tasks</h3>
                                                <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">{tasks.filter(t => !t.completed).length} pending</span>
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {tasks.slice(0, 5).map(task => (
                                                    <div key={task.id} className="flex items-center gap-3 group">
                                                        <button 
                                                            onClick={() => handleTaskAction('complete', task.title)}
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-white'}`}
                                                        >
                                                            {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        </button>
                                                        <span className={`text-sm ${task.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>{task.title}</span>
                                                    </div>
                                                ))}
                                                {tasks.length === 0 && <p className="text-sm text-white/40 italic">No tasks yet.</p>}
                                            </div>
                                        </div>

                                        {/* Mood Chart Mini */}
                                        <div className={`${themeStyles.card} rounded-2xl p-5`}>
                                             <h3 className="font-semibold text-white mb-4">Mood Trend</h3>
                                             <div className="h-40">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={moodHistory.slice(-7)}>
                                                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                            {moodHistory.slice(-7).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#34d399' : entry.score >= 3 ? '#fbbf24' : '#f87171'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                             </div>
                                        </div>
                                    </div>

                                    {/* Reminders */}
                                    <div className={`${themeStyles.card} rounded-2xl p-5`}>
                                        <h3 className="font-semibold text-white mb-3">Reminders</h3>
                                        <div className="space-y-2">
                                            {reminders.slice(0,3).map(r => (
                                                <div key={r.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                                                    <span className={`text-sm ${r.completed ? 'line-through opacity-50' : ''}`}>{r.title}</span>
                                                    {r.completed && <span className="text-xs text-emerald-400">Done</span>}
                                                </div>
                                            ))}
                                             {reminders.length === 0 && <p className="text-sm text-white/40 italic">No active reminders.</p>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* SOCIAL TAB */}
                            {activeTab === 'social' && (
                                <div className="h-[600px] flex flex-col md:flex-row gap-4">
                                    {/* Friends List & Add */}
                                    <div className={`${themeStyles.card} rounded-2xl p-4 md:w-1/3 flex flex-col`}>
                                        <h3 className="font-semibold text-white mb-4">Friends</h3>
                                        
                                        {/* Add Friend Input */}
                                        <div className="mb-4">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={addFriendInput}
                                                    onChange={(e) => setAddFriendInput(e.target.value)}
                                                    placeholder="Username, Email or Code"
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                                                />
                                                <button 
                                                    onClick={handleAddFriend}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                </button>
                                            </div>
                                            {addFriendError && <p className="text-red-400 text-xs mt-1">{addFriendError}</p>}
                                        </div>

                                        {/* Suggested Friends */}
                                        {suggestedFriends.length > 0 && (
                                            <div className="mb-4 bg-white/5 rounded-xl p-3 border border-white/5">
                                                <h4 className="text-xs text-white/50 uppercase font-semibold mb-2">People You May Know</h4>
                                                <div className="space-y-2">
                                                    {suggestedFriends.map(s => (
                                                        <div key={s.id} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px]">{s.username.slice(0,2).toUpperCase()}</div>
                                                                <span className="text-xs text-white/80">{s.username}</span>
                                                            </div>
                                                            <button onClick={() => executeAddFriend(s)} className="text-xs text-blue-400 hover:text-white px-2 py-1 bg-blue-500/10 rounded">Add</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* List */}
                                        <div className="flex-1 overflow-y-auto space-y-2">
                                            {friends.map(friend => (
                                                <div 
                                                    key={friend.id} 
                                                    onClick={() => { setActiveChatId(friend.id); setMessages(StorageService.getConversation(user.id, friend.id)); }}
                                                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${activeChatId === friend.id ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                                        {friend.username.slice(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium text-white truncate">{friend.name}</p>
                                                        <p className="text-xs text-white/50 truncate">@{friend.username}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {friends.length === 0 && <p className="text-center text-white/30 text-sm py-4">No friends yet.</p>}
                                        </div>
                                    </div>

                                    {/* Chat Area */}
                                    <div className={`${themeStyles.card} rounded-2xl flex-1 flex flex-col overflow-hidden`}>
                                        {activeChatId ? (
                                            <>
                                                {/* Chat Header */}
                                                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                                                        {friends.find(f => f.id === activeChatId)?.username.slice(0,2).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-white">
                                                        {friends.find(f => f.id === activeChatId)?.username}
                                                    </span>
                                                </div>

                                                {/* Messages */}
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                    {messages.map(msg => {
                                                        const isMe = msg.senderId === user.id;
                                                        return (
                                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-700 text-white rounded-bl-none'}`}>
                                                                    {msg.type === 'text' && <p>{msg.content}</p>}
                                                                    {msg.type === 'image' && (
                                                                        <img src={msg.content} alt="Shared" className="rounded-lg max-h-48 object-cover my-1" />
                                                                    )}
                                                                    <p className="text-[10px] opacity-50 mt-1 text-right">
                                                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={messagesEndRef} />
                                                </div>

                                                {/* Input Area */}
                                                <div className="p-3 border-t border-white/10 bg-black/20 flex gap-2 items-center">
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="p-2 text-white/50 hover:text-white transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </button>
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef} 
                                                        onChange={handleImageUpload} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                    />
                                                    <input
                                                        type="text"
                                                        value={messageInput}
                                                        onChange={(e) => setMessageInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                        placeholder="Type a message..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button 
                                                        onClick={handleSendMessage}
                                                        disabled={!messageInput.trim()}
                                                        className="p-2 bg-blue-600 rounded-full text-white disabled:opacity-50 hover:bg-blue-500"
                                                    >
                                                        <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                                                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                                                <p>Select a friend to start chatting</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                             {/* PROFILE TAB */}
                            {activeTab === 'profile' && (
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {/* Header Card */}
                                    <div className={`${themeStyles.card} rounded-3xl p-8 relative overflow-hidden`}>
                                        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-r ${themeStyles.colors.gradient} opacity-20`}></div>
                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 mt-8">
                                            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${themeStyles.colors.gradient} flex items-center justify-center text-3xl font-bold shadow-2xl border-4 border-black/20`}>
                                                {user.username.slice(0,2).toUpperCase()}
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h2 className="text-3xl font-bold text-white">{user.name}</h2>
                                                <p className="text-white/50">@{user.username}</p>
                                                <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                                                     <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/70">
                                                         {user.isAdultMode ? 'Unfiltered Mode' : 'Safe Mode'}
                                                     </span>
                                                     <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/70">
                                                         Member since {new Date(parseInt(user.id)).getFullYear()}
                                                     </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Invite Code Card */}
                                        <div className={`${themeStyles.card} rounded-2xl p-6`}>
                                            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                                Invite Friends
                                            </h3>
                                            <p className="text-sm text-white/50 mb-4">Share this code with your friends so they can add you directly.</p>
                                            
                                            <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
                                                <code className="text-2xl font-mono tracking-widest text-blue-400 font-bold">
                                                    {user.inviteCode || 'LOADING'}
                                                </code>
                                                <button 
                                                    onClick={() => {
                                                        if (user.inviteCode) {
                                                            navigator.clipboard.writeText(user.inviteCode);
                                                            alert('Code copied!');
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className={`${themeStyles.card} rounded-2xl p-6`}>
                                            <h3 className="font-semibold text-white mb-4">Your Activity</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                                    <span className="text-sm text-white/60">Friends Added</span>
                                                    <span className="text-lg font-bold text-white">{friends.length}</span>
                                                </div>
                                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                                    <span className="text-sm text-white/60">Tasks Completed</span>
                                                    <span className="text-lg font-bold text-white">{tasks.filter(t => t.completed).length}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-white/60">Mood Logs</span>
                                                    <span className="text-lg font-bold text-white">{moodHistory.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TASKS TAB */}
                            {activeTab === 'tasks' && (
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                        <div key={task.id} className={`${themeStyles.card} p-4 rounded-xl flex items-center gap-3`}>
                                            <button 
                                                onClick={() => handleTaskAction('complete', task.title)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-white'}`}
                                            >
                                                {task.completed && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </button>
                                            <span className={`flex-1 ${task.completed ? 'text-white/30 line-through' : 'text-white'}`}>{task.title}</span>
                                            <button onClick={() => handleTaskAction('delete', task.title)} className="text-white/40 hover:text-red-400 p-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NOTES TAB */}
                            {activeTab === 'notes' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {notes.map(note => (
                                        <div key={note.id} className={`${themeStyles.card} p-5 rounded-xl relative group`}>
                                            <p className="text-white/90 text-sm whitespace-pre-wrap">{note.content}</p>
                                            <p className="text-xs text-white/30 mt-4">{new Date(note.createdAt).toLocaleDateString()}</p>
                                            <button 
                                                onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* GALLERY TAB */}
                            {activeTab === 'gallery' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {gallery.map(item => (
                                        <div key={item.id} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-white/10">
                                            <img src={item.data} alt="Generated" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <a href={item.data} download={`rio-gen-${item.id}.png`} className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/40">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className={`${themeStyles.card} w-full max-w-lg rounded-2xl p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="text-white/50 hover:text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Theme */}
                            <div>
                                <label className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3 block">Theme Color</label>
                                <div className="flex gap-3">
                                    {(['blue', 'purple', 'green', 'orange', 'rose'] as ThemeColor[]).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => onUpdateUser({ theme: { ...user.theme, primaryColor: color } })}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${user.theme.primaryColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: `var(--color-${color}-500)` }} // Fallback if tailwind classes not dynamic enough in style
                                        >
                                            <div className={`w-full h-full rounded-full ${color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-600' : color === 'green' ? 'bg-emerald-500' : color === 'orange' ? 'bg-orange-500' : 'bg-rose-500'}`}></div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                             {/* Spotify */}
                             <div>
                                <label className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3 block">Integrations</label>
                                {user.spotify?.accessToken ? (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                                        <span className="text-green-400 font-medium flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                            Spotify Connected
                                        </span>
                                        <button onClick={() => onUpdateUser({ spotify: undefined })} className="text-xs text-white/50 hover:text-white underline">Disconnect</button>
                                    </div>
                                ) : (
                                    <a 
                                        href={SpotifyService.getAuthUrl(user.spotifyClientId)}
                                        className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Connect Spotify
                                    </a>
                                )}
                             </div>

                             <div className="pt-6 border-t border-white/10">
                                 <button onClick={onLogout} className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors">
                                     Log Out
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;