import React, { useState, useEffect, useRef } from 'react';
import { Task, Reminder, Note, MoodEntry, UserProfile, LiveStatus, ThemeColor, ThemePreferences, GalleryItem, MediaContent } from '../types';
import Visualizer from './Visualizer';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SpotifyService } from '../services/spotifyService';
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

// Stock backgrounds
const BACKGROUNDS = [
    { name: "Dark Abstract", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80" },
    { name: "Neon City", url: "https://images.unsplash.com/photo-1514306191717-452245255e0c?auto=format&fit=crop&w=1920&q=80" },
    { name: "Serene Nature", url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1920&q=80" }
];

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
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notes' | 'mood' | 'gallery' | 'settings'>('overview');
    const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

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
        mediaContent
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
                             <div className="absolute top-4 right-4 z-20">
                                {status === 'disconnected' || status === 'error' ? (
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
                                { id: 'tasks', label: 'Tasks' },
                                { id: 'notes', label: 'Notes' },
                                { id: 'mood', label: 'Mood' },
                                { id: 'gallery', label: 'Gallery' }
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