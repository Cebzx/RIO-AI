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
    { name: "Dark Abstract", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80" },
    { name: "Cosmic", url: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&w=2000&q=80" },
    { name: "Neon City", url: "https://images.unsplash.com/photo-1565214975484-3cfa9e56f914?auto=format&fit=crop&w=2000&q=80" },
    { name: "Deep Forest", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2000&q=80" },
    { name: "Ocean Calm", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80" },
    { name: "Minimal White", url: "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=2000&q=80" },
    { name: "Sunset Vibes", url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2000&q=80" },
    { name: "Mountain High", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80" },
    { name: "Mystic Aura", url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=2000&q=80" },
    { name: "Cozy Rain", url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=2000&q=80" }
];

const Dashboard: React.FC<DashboardProps> = ({ 
  user, tasks, setTasks, reminders, setReminders, notes, setNotes, moodHistory, setMoodHistory, gallery, setGallery, onUpdateUser, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'reminders' | 'notes' | 'gallery' | 'mood'>('home');
  const [inputText, setInputText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'voice' | 'appearance' | 'layout'>('profile');
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Local state for profile editing
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editAvatar, setEditAvatar] = useState(user.avatar || '');
  
  // Detect if Speech Recognition is supported (for Hands Free settings)
  const isSpeechRecognitionSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const styles = getThemeStyles(user.theme);

  // Nav Items Configuration
  const navItems = [
    { id: 'home', label: 'Home', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { id: 'tasks', label: 'Tasks', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
    { id: 'reminders', label: 'Reminders', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
    { id: 'mood', label: 'Mood', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { id: 'notes', label: 'Notes', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /> },
    { id: 'gallery', label: 'Gallery', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> }
  ];

  // Clear input when tab changes
  useEffect(() => {
    setInputText('');
  }, [activeTab]);
  
  useEffect(() => {
    setEditBio(user.bio || '');
    setEditAvatar(user.avatar || '');
  }, [user]);

  // Handle Spotify OAuth Callback
  useEffect(() => {
    const tokenData = SpotifyService.getTokenFromUrl();
    if (tokenData) {
        onUpdateUser({
            spotify: {
                accessToken: tokenData.accessToken,
                expirationTime: Date.now() + parseInt(tokenData.expiresIn) * 1000
            }
        });
        window.location.hash = ''; // Clear token from URL
    }
  }, []);

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // Resize to thumbnail size to save LocalStorage space
                  const MAX_WIDTH = 800;
                  const scale = MAX_WIDTH / img.width;
                  canvas.width = MAX_WIDTH;
                  canvas.height = img.height * scale;
                  
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                  
                  const base64 = canvas.toDataURL('image/jpeg', 0.7);
                  
                  const newItem: GalleryItem = {
                      id: Date.now().toString() + Math.random(),
                      data: base64,
                      timestamp: Date.now()
                  };
                  
                  setGallery(prev => [newItem, ...prev]);
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      });
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Resize for background (larger than gallery thumbnails)
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1920;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = height * (MAX_WIDTH / width);
                width = MAX_WIDTH;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            onUpdateUser({ theme: { ...user.theme, backgroundImage: base64 } });
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  // --- VOICE RECORDING HANDLERS ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Determine supported mime type (Crucial for iOS compatibility)
        let options = {};
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
             mimeType = 'audio/mp4';
             options = { mimeType };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
             mimeType = 'audio/webm';
             options = { mimeType };
        }
        
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data.size > 0) {
                audioChunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blobType = mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Audio = reader.result as string;
                // Save new note with audio
                setNotes(prev => [{
                    id: Date.now().toString(),
                    content: inputText || "Voice Note",
                    createdAt: Date.now(),
                    audioData: base64Audio
                }, ...prev]);
                setInputText("");
            };
            reader.readAsDataURL(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Failed to start recording", err);
        alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };


  // Tool Handlers
  const handleTaskAction = async (action: string, title?: string, searchTerm?: string): Promise<string> => {
    return new Promise((resolve) => {
      setTasks(prev => {
        let newItems = [...prev];
        let msg = "";
        if (action === 'create' && title) {
          newItems.push({ id: Date.now().toString(), title, completed: false, createdAt: Date.now() });
          msg = `Added task: ${title}`;
        } else if (action === 'complete' || action === 'delete') {
          const term = searchTerm?.toLowerCase() || title?.toLowerCase();
          if (!term) return prev;
          const idx = newItems.findIndex(t => t.title.toLowerCase().includes(term));
          if (idx !== -1) {
            const name = newItems[idx].title;
            if (action === 'delete') {
              newItems.splice(idx, 1);
              msg = `Deleted task: ${name}`;
            } else {
              newItems[idx].completed = true;
              msg = `Completed: ${name}`;
            }
          } else {
            msg = `Couldn't find task matching "${term}"`;
          }
        }
        resolve(msg);
        return newItems;
      });
    });
  };

  const handleReminderAction = async (action: string, title?: string, searchTerm?: string): Promise<string> => {
    return new Promise((resolve) => {
      setReminders(prev => {
        let newItems = [...prev];
        let msg = "";
        if (action === 'create' && title) {
          newItems.push({ id: Date.now().toString(), title, completed: false, createdAt: Date.now() });
          msg = `Set reminder: ${title}`;
        } else if (action === 'complete' || action === 'delete') {
            const term = searchTerm?.toLowerCase() || title?.toLowerCase();
            if(!term) return prev;
            const idx = newItems.findIndex(t => t.title.toLowerCase().includes(term));
            if(idx !== -1) {
                if(action === 'delete') {
                    newItems.splice(idx, 1);
                    msg = "Reminder deleted.";
                } else {
                    newItems[idx].completed = true;
                    msg = "Reminder completed.";
                }
            } else { msg = "Reminder not found."; }
        }
        resolve(msg);
        return newItems;
      });
    });
  };

  const handleNoteAction = async (action: string, content?: string): Promise<string> => {
    return new Promise((resolve) => {
      setNotes(prev => {
        let newItems = [...prev];
        let msg = "";
        if (action === 'create' && content) {
          newItems.unshift({ id: Date.now().toString(), content, createdAt: Date.now() });
          msg = "Note saved.";
        } else if (action === 'delete' && content) {
             const idx = newItems.findIndex(n => n.content.includes(content));
             if(idx !== -1) newItems.splice(idx, 1);
             msg = "Note deleted.";
        }
        resolve(msg);
        return newItems;
      });
    });
  };

  const handleMoodAction = async (score: number, notes?: string): Promise<string> => {
    const entry: MoodEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      score,
      notes: notes || ''
    };
    setMoodHistory(prev => [...prev, entry]);
    return `Mood logged: ${score}/5.`;
  };

  const { connect, disconnect, status, isSpeaking, volume, outputVolume, setOutputVolume, sources, mediaContent } = useGeminiLive({
    userProfile: user,
    tasks, reminders, notes,
    onTaskAction: handleTaskAction,
    onReminderAction: handleReminderAction,
    onNoteAction: handleNoteAction,
    onMoodAction: handleMoodAction,
    onSpotifyAction: (result) => {}
  });

  // --- TRANSITION STATE FOR MEDIA ---
  const [displayMedia, setDisplayMedia] = useState<MediaContent | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const isSame = (a: MediaContent | null, b: MediaContent | null) => {
        if (a === b) return true;
        if (!a || !b) return false;
        return a.type === b.type && a.url === b.url && a.content === b.content;
    };

    if (!isSame(mediaContent, displayMedia)) {
        if (!displayMedia) {
            // First mount: show immediately (animate-dissolve handles entry)
            setDisplayMedia(mediaContent);
        } else {
            // Change content: Fade out old -> Set new -> Fade in new
            setIsTransitioning(true);
            const timer = setTimeout(() => {
                setDisplayMedia(mediaContent);
                setIsTransitioning(false);
            }, 300); // 300ms fade out match
            return () => clearTimeout(timer);
        }
    }
  }, [mediaContent, displayMedia]);

  const toggleSession = () => (status === LiveStatus.CONNECTED || status === LiveStatus.CONNECTING) ? disconnect() : connect();

  // --- HANDS FREE LOGIC ---
  useEffect(() => {
    if (!user.isHandsFree) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    const WAKE_PHRASES = ['rio', 'hey rio', 'hi rio', 'hello rio'];

    recognition.onresult = (event: any) => {
      if (status === LiveStatus.CONNECTED || status === LiveStatus.CONNECTING) return;
      const latestResult = event.results[event.results.length - 1];
      if (latestResult.isFinal) {
          const transcript = latestResult[0].transcript.toLowerCase().trim();
          if (WAKE_PHRASES.some(phrase => transcript.includes(phrase))) {
            connect();
            recognition.stop();
          }
      }
    };
    
    recognition.onend = () => {
        if (status === LiveStatus.DISCONNECTED && user.isHandsFree) {
            setTimeout(() => { try { recognition.start(); } catch (e) {} }, 500);
        }
    };
    if (status === LiveStatus.DISCONNECTED) { try { recognition.start(); } catch (e) {} }
    return () => { recognition.stop(); };
  }, [user.isHandsFree, status, connect]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (activeTab === 'tasks') handleTaskAction('create', inputText);
    if (activeTab === 'reminders') handleReminderAction('create', inputText);
    if (activeTab === 'notes') handleNoteAction('create', inputText);
    setInputText('');
  };

  const getHostname = (url?: string) => {
    if (!url) return 'INTERNAL_SYS';
    try { return new URL(url).hostname.replace('www.', '').toUpperCase(); } 
    catch { return 'EXTERNAL_LINK'; }
  };

  const saveProfile = () => {
    onUpdateUser({ bio: editBio, avatar: editAvatar });
  };

  const renderVideoDisplay = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let embedUrl = url;
        if (url.includes('watch?v=')) {
            embedUrl = url.replace('watch?v=', 'embed/').split('&')[0];
        } else if (url.includes('youtu.be/')) {
            embedUrl = url.replace('youtu.be/', 'www.youtube.com/embed/');
        }
        return (
            <div className="w-full aspect-video relative z-10">
                <iframe 
                    src={`${embedUrl}?autoplay=1&controls=0&modestbranding=1&rel=0`} 
                    className="w-full h-full border-0" 
                    allowFullScreen 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            </div>
        );
    }
    if (url.includes('tiktok.com')) {
        const match = url.match(/\/video\/(\d+)/);
        const videoId = match ? match[1] : null;
        if (videoId) return <div className="w-full flex justify-center h-[500px] relative z-10 py-4"><iframe src={`https://www.tiktok.com/embed/v2/${videoId}`} className="w-[325px] h-full border-0 rounded-xl shadow-2xl" allowFullScreen allow="autoplay; encrypted-media;"/></div>;
    }
    return (
        <div className="w-full relative z-10 p-2">
            <video className="w-full max-h-[450px] rounded-lg object-contain" controls autoPlay>
                <source src={url} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
  };

  const renderMusicDisplay = (url: string) => {
    if (url.includes('spotify.com')) return <div className="w-full relative z-10 p-4"><iframe src={url.replace('open.spotify.com', 'open.spotify.com/embed')} className="w-full h-[152px] rounded-xl shadow-lg border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>;
    if (url.includes('music.apple.com')) return <div className="w-full relative z-10 p-4"><iframe allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" height="175" className="w-full max-w-[660px] overflow-hidden rounded-xl border-0 bg-transparent" src={url.replace('music.apple.com', 'embed.music.apple.com')}></iframe></div>;
    if (url.includes('soundcloud.com')) return <div className="w-full relative z-10 p-4"><iframe width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233b82f6&auto_play=true`} className="rounded-xl"></iframe></div>;
    return <div className="w-full relative z-10 p-6 flex flex-col items-center"><audio controls src={url} className="w-full" /><a href={url} target="_blank" className="text-xs text-blue-400 mt-4 hover:underline">Open External Link</a></div>;
  };

  // --- UI COMPONENTS ---

  const renderGallery = () => (
      <div className="space-y-6 animate-fade-in relative z-10 pb-6">
          <div className={`${styles.card} rounded-3xl p-6`}>
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-xl font-semibold text-white">Memories</h2>
                      <p className="text-zinc-400 text-xs">Your personal visual collection.</p>
                  </div>
                  <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition-all ${styles.colors.bg} hover:opacity-90`}>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Upload
                      </span>
                  </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {gallery.length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                          <p>No photos yet. Add some to get started!</p>
                      </div>
                  )}
                  {gallery.map((item) => (
                      <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-900 shadow-lg">
                          <img src={item.data} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => setGallery(prev => prev.filter(g => g.id !== item.id))}
                                className="bg-red-500/20 text-red-400 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"
                              >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderMood = () => (
      <div className="space-y-6 animate-fade-in relative z-10 pb-6">
          <div className={`${styles.card} rounded-3xl p-6`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-xl font-semibold text-white">Mood Trends</h2>
                   <p className="text-zinc-400 text-xs">Your emotional journey over the last week.</p>
                </div>
                <div className="text-xs font-medium text-zinc-500 bg-white/5 px-2 py-1 rounded-md">Last 7 Days</div>
              </div>
              
              <div className="h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={moodHistory.slice(-7).map(m => ({ day: new Date(m.timestamp).toLocaleDateString('en-US', {weekday:'short'}), score: m.score }))}>
                        <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)', radius: 4}}/>
                        <Bar dataKey="score" radius={[4, 4, 4, 4]} barSize={40}>
                            {moodHistory.map((e, i) => <Cell key={i} fill={e.score >= 4 ? styles.colors.textDark.replace('text-', '') : e.score <= 2 ? '#ef4444' : '#52525b'} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>

              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Recent Logs</h3>
              <div className="space-y-3">
                  {moodHistory.length === 0 && <div className="text-center text-zinc-500/50 text-sm py-4">No mood entries yet.</div>}
                  {[...moodHistory].reverse().slice(0, 5).map((entry) => (
                      <div key={entry.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                          <div>
                             <div className="text-sm text-white font-medium mb-0.5">{entry.score >= 4 ? 'Great' : entry.score === 3 ? 'Okay' : 'Tough'} Day</div>
                             <div className="text-xs text-zinc-400">{new Date(entry.timestamp).toLocaleDateString()} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${entry.score >= 4 ? 'bg-green-500/20 text-green-400' : entry.score === 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                              {entry.score}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in relative z-10 pb-6 w-full">
       {/* Hero Panel */}
       {user.widgets.showGreeting && (
        <div className={`${styles.card} rounded-3xl p-8 text-center md:text-left relative overflow-hidden transition-all duration-500 flex flex-col md:flex-row md:items-center md:gap-8`}>
          {/* Status Indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
              {user.isHandsFree && status === LiveStatus.DISCONNECTED && (
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider animate-pulse">Listening for 'Rio'</span>
              )}
              <div className={`w-2.5 h-2.5 rounded-full ${status === LiveStatus.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : user.isHandsFree ? 'bg-amber-500/50' : 'bg-zinc-700'}`}></div>
          </div>

          <div className="mb-6 md:mb-0 flex flex-col items-center md:items-start md:min-w-[200px]">
             {user.avatar && <img src={user.avatar} alt="Profile" className={`w-16 h-16 rounded-full object-cover mb-4 ring-2 ${styles.colors.ring} ring-offset-2 ring-offset-zinc-900`} />}
             <h2 className="text-2xl font-semibold text-white mb-1">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}</h2>
             <p className={`${styles.colors.text} text-sm opacity-80`}>{status === LiveStatus.CONNECTED ? 'Listening...' : user.isHandsFree ? 'Say "Hey Rio" to start.' : 'Ready to help.'}</p>
          </div>

          <div className="flex-1 w-full flex justify-center">
            {user.widgets.showVisualizer && (
                <div className="w-full max-w-xs">
                    <Visualizer volume={volume} isActive={status === LiveStatus.CONNECTED} isSpeaking={isSpeaking} />
                </div>
            )}
          </div>
          
          <div className="mt-8 md:mt-0 flex flex-col items-center gap-6 md:min-w-[120px]">
             <button 
               onClick={toggleSession} 
               className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
               ${status === LiveStatus.CONNECTED 
                 ? `${styles.colors.bgSoft} ${styles.colors.textDark} hover:bg-opacity-20 ring-1 ${styles.colors.border}` 
                 : 'bg-white text-black hover:scale-110 ring-4 ring-white/10'}`}
             >
               {status === LiveStatus.CONNECTED ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
               ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
               )}
             </button>
             
             {/* Simple Volume Slider */}
             <div className="w-32 md:w-24 group">
                <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={outputVolume} 
                    onChange={(e) => setOutputVolume(parseFloat(e.target.value))} 
                    className={`w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:bg-white`} 
                />
             </div>
          </div>
       </div>
       )}

       {/* Holographic Display Box - Now using displayMedia state for transitions */}
       {displayMedia && (
         <div className={`relative group my-4 transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${styles.colors.gradient} rounded-[2rem] opacity-30 group-hover:opacity-60 blur-lg transition duration-1000`}></div>
            <div className={`relative ${styles.card} rounded-[1.75rem] overflow-hidden shadow-2xl`}>
                <div className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-20" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.5) 50%)', backgroundSize: '100% 4px' }}></div>
                <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/90 to-transparent z-30 flex justify-between items-start p-5">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${styles.colors.bg} ${styles.colors.glow} animate-pulse`}></div>
                             <span className={`text-[10px] font-mono font-bold tracking-[0.2em] ${styles.colors.text} uppercase drop-shadow-md`}>RIO_VISUAL_LINK</span>
                        </div>
                        {displayMedia.title && <h3 className={`text-sm font-semibold text-white/90 tracking-tight pl-3.5 border-l-2 ${styles.colors.border}`}>{displayMedia.title}</h3>}
                    </div>
                </div>
                
                {/* Content Area with Keyed Animation */}
                <div className="relative min-h-[220px] flex items-center justify-center bg-black/40">
                   <div key={displayMedia.url || displayMedia.content || 'media'} className="w-full flex justify-center animate-dissolve">
                    {displayMedia.type === 'image' && displayMedia.url && <div className="relative w-full overflow-hidden group-hover:scale-[1.02] transition-transform duration-700 ease-out"><img src={displayMedia.url} alt={displayMedia.title || "Visual"} className="w-full h-auto max-h-[450px] object-cover"/><div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none"></div></div>}
                    {displayMedia.type === 'video' && displayMedia.url && renderVideoDisplay(displayMedia.url)}
                    {displayMedia.type === 'music' && displayMedia.url && renderMusicDisplay(displayMedia.url)}
                    {displayMedia.type === 'text' && <div className="p-10 text-center relative z-10"><p className="text-lg md:text-xl font-medium text-white leading-relaxed font-mono"><span className={`${styles.colors.text} opacity-50 mr-2`}>{'>'}</span>{displayMedia.content}<span className={`animate-pulse ml-1 inline-block w-2 h-5 ${styles.colors.bg} align-middle`}></span></p></div>}
                   </div>
                </div>

                 <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/90 to-transparent z-30 flex justify-between items-end p-4">
                     <div className="text-[9px] text-white/30 font-mono">SRC: {getHostname(displayMedia.url)}</div>
                     <div className={`text-[9px] ${styles.colors.text} opacity-50 font-mono animate-pulse`}>LIVE_FEED_ACTIVE</div>
                 </div>
            </div>
         </div>
       )}

       {/* Search Sources Display */}
       {user.widgets.showSources && sources.length > 0 && (
         <div className={`${styles.card} rounded-3xl p-5 animate-fade-in`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Sources</h3>
            <div className="flex flex-col gap-2">
              {sources.map((source, idx) => (
                <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                  <div className={`w-8 h-8 rounded-full ${styles.colors.bgSoft} flex items-center justify-center ${styles.colors.text}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{source.title}</p><p className="text-xs text-zinc-500 truncate">{new URL(source.uri).hostname}</p></div>
                </a>
              ))}
            </div>
         </div>
       )}
    </div>
  );

  const renderList = (type: 'tasks' | 'reminders') => {
    const items = type === 'tasks' ? tasks : reminders;
    return (
      <div className="space-y-4 animate-fade-in h-full flex flex-col relative z-10 pb-6">
         <form onSubmit={handleManualSubmit} className="relative group">
            <div className={`absolute inset-0 ${styles.colors.bgSoft} blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>
            <div className={`${styles.card} flex items-center p-1 rounded-2xl relative`}>
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Add a ${type === 'tasks' ? 'task' : 'reminder'}...`} className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 px-5 py-4 text-sm"/>
                <button type="submit" className="bg-white/10 text-white rounded-xl w-12 h-12 flex items-center justify-center hover:bg-white/20 transition-colors mr-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            </div>
         </form>
         
         <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
            {items.length === 0 && <div className="flex flex-col items-center justify-center h-48 text-zinc-500/50"><p className="text-sm">No {type} yet.</p></div>}
            {items.map((item: any) => (
               <div key={item.id} className={`${styles.card} group relative flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-300`}>
                  <button onClick={() => type === 'tasks' ? handleTaskAction('complete', undefined, item.title) : handleReminderAction('complete', undefined, item.title)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? `${styles.colors.bg} ${styles.colors.border}` : `border-zinc-600 hover:${styles.colors.border}`}`}>
                     {item.completed && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <span className={`flex-1 font-medium ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{item.title}</span>
                  <button onClick={() => type === 'tasks' ? handleTaskAction('delete', undefined, item.title) : handleReminderAction('delete', undefined, item.title)} className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 px-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
               </div>
            ))}
         </div>
      </div>
    );
  };

  const renderNotes = () => (
    <div className="space-y-4 animate-fade-in h-full flex flex-col relative z-10 pb-6">
      <form onSubmit={handleManualSubmit} className="relative group">
         <div className={`absolute inset-0 ${styles.colors.bgSoft} blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>
         <div className={`${styles.card} rounded-2xl p-1 relative`}>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Write something or record a note..." className="w-full bg-transparent border-none rounded-xl px-5 py-4 text-white placeholder-zinc-500 focus:ring-0 h-32 resize-none text-sm leading-relaxed" onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleManualSubmit(e); }}}/>
            
            <div className="absolute bottom-3 right-3 flex gap-2">
                 <button 
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-xl transition-all shadow-lg backdrop-blur-sm flex items-center justify-center gap-2 ${isRecording ? 'bg-red-500 text-white animate-pulse pr-4' : 'bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300'}`}
                 >
                    {isRecording ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                            <span className="text-xs font-bold">REC</span>
                        </>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    )}
                 </button>
                <button type="submit" className={`bg-${user.theme.primaryColor}-500 hover:opacity-90 text-white p-2 rounded-xl transition-colors shadow-lg backdrop-blur-sm`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
            </div>
         </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pb-20">
          {notes.length === 0 && <div className="col-span-full text-center text-zinc-500/50 text-sm mt-12">Your notes will appear here.</div>}
          {notes.map(note => (
              <div key={note.id} className={`${styles.card} p-4 rounded-2xl relative group hover:bg-white/5 transition-all duration-300 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md`}>
                  <div>
                      <p className="text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">{note.content}</p>
                      {note.audioData && (
                          <div className="mt-3 bg-black/20 rounded-lg p-2">
                              <audio controls src={note.audioData} className="w-full h-8" />
                          </div>
                      )}
                  </div>
                  <div className="flex justify-between items-end mt-4">
                     <div className="text-[10px] text-zinc-500 font-medium">{new Date(note.createdAt).toLocaleDateString()}</div>
                     <button onClick={() => handleNoteAction('delete', note.content)} className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );

  // --- SETTINGS RENDERER ---

  const renderSettings = () => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
        <div className={`w-full max-w-sm md:max-w-md ${styles.card} border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl relative shadow-2xl h-[85vh] sm:h-[600px] flex flex-col`}>
             <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mt-3 mb-2 sm:hidden flex-shrink-0"></div>
             
             <div className="flex justify-between items-center px-6 py-4 flex-shrink-0 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <button onClick={() => { saveProfile(); setShowSettings(false); }} className="bg-white/5 p-2 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {/* Tabs */}
             <div className="flex px-6 pt-4 space-x-4 flex-shrink-0 overflow-x-auto scrollbar-hide">
                <button onClick={() => setSettingsTab('profile')} className={`pb-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'profile' ? 'text-white' : 'text-zinc-500'}`}>Profile{settingsTab === 'profile' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.colors.bg} rounded-full`}></div>}</button>
                <button onClick={() => setSettingsTab('voice')} className={`pb-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'voice' ? 'text-white' : 'text-zinc-500'}`}>Voice{settingsTab === 'voice' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.colors.bg} rounded-full`}></div>}</button>
                <button onClick={() => setSettingsTab('appearance')} className={`pb-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'appearance' ? 'text-white' : 'text-zinc-500'}`}>Appearance{settingsTab === 'appearance' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.colors.bg} rounded-full`}></div>}</button>
                <button onClick={() => setSettingsTab('layout')} className={`pb-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'layout' ? 'text-white' : 'text-zinc-500'}`}>Layout{settingsTab === 'layout' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.colors.bg} rounded-full`}></div>}</button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {settingsTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center">
                            <div className={`w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 overflow-hidden ring-4 ${styles.colors.ring} ring-opacity-20`}>{editAvatar ? (<img src={editAvatar} alt="Profile" className="w-full h-full object-cover" />) : (<span className="text-2xl font-bold text-zinc-600">{user.name[0]}</span>)}</div>
                            <input type="text" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="Paste Image URL" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-center text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white/20" />
                            <p className="text-[10px] text-zinc-500 mt-2">Paste a direct link to an image (png/jpg)</p>
                        </div>
                        <div><label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">About Me</label><textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 h-24 resize-none" placeholder="Add a short bio..."/></div>
                        <div className="space-y-3"><div><label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Username</label><div className="text-zinc-300 text-sm mt-1">{user.username}</div></div><div><label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Email</label><div className="text-zinc-300 text-sm mt-1">{user.email}</div></div></div>
                        <div className="pt-4 border-t border-white/5"><button onClick={onLogout} className="w-full py-3 text-red-400 font-medium hover:bg-red-500/10 rounded-xl transition-colors text-sm">Log Out</button></div>
                    </div>
                )}

                {settingsTab === 'voice' && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Voice Interaction</h3>
                        
                        {/* Hands Free Toggle - Only if browser supports SpeechRecognition */}
                        {isSpeechRecognitionSupported ? (
                             <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                                <div>
                                    <span className="text-sm font-medium text-white block">Hands-Free Mode</span>
                                    <span className="text-xs text-zinc-500 mt-1 block">Wake Rio by saying "Hey Rio" or "Rio"</span>
                                </div>
                                <button onClick={() => onUpdateUser({ isHandsFree: !user.isHandsFree })} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${user.isHandsFree ? styles.colors.bg : 'bg-zinc-700'}`}>
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${user.isHandsFree ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        ) : (
                             <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl opacity-60">
                                <div>
                                    <span className="text-sm font-medium text-white block">Hands-Free Mode</span>
                                    <span className="text-xs text-zinc-500 mt-1 block">Not supported on this browser</span>
                                </div>
                            </div>
                        )}
                        
                         {/* Content Mode */}
                         <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                            <div>
                                <span className="text-sm font-medium text-white block">Unfiltered Mode</span>
                                <span className="text-xs text-zinc-500 mt-1 block">Allow more casual and unfiltered responses.</span>
                            </div>
                            <button onClick={() => onUpdateUser({ isAdultMode: !user.isAdultMode })} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${user.isAdultMode ? 'bg-purple-600' : 'bg-zinc-700'}`}>
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${user.isAdultMode ? 'translate-x-6' : 'translate-x-1'}`}></div>
                            </button>
                        </div>
                    </div>
                )}

                {settingsTab === 'appearance' && (
                    <div className="space-y-8">
                         {/* Custom Wallpaper Section */}
                         <div>
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Custom Wallpaper</h3>
                            <div className="flex gap-3">
                                <label className="flex-1 cursor-pointer bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors group">
                                    <svg className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">Upload Image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                                </label>
                                {user.theme.backgroundImage && (
                                    <button onClick={() => onUpdateUser({ theme: { ...user.theme, backgroundImage: undefined } })} className="px-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium hover:bg-red-500/20 transition-colors">
                                        Remove
                                    </button>
                                )}
                            </div>
                         </div>

                         <div>
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Stock Wallpapers</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {BACKGROUNDS.map((bg) => (
                                    <button 
                                        key={bg.name} 
                                        onClick={() => onUpdateUser({ theme: { ...user.theme, backgroundImage: bg.url } })}
                                        className={`relative aspect-video rounded-xl overflow-hidden group border-2 transition-all ${user.theme.backgroundImage === bg.url ? `border-${user.theme.primaryColor}-500 shadow-lg` : 'border-transparent opacity-70 hover:opacity-100 hover:scale-[1.02]'}`}
                                    >
                                        <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs font-bold text-white shadow-sm">{bg.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                         </div>
                         
                         <div>
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Integrations</h3>
                            <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg></div><div><div className="text-sm font-medium text-white">Spotify</div><div className="text-xs text-zinc-400">{user.spotify?.accessToken ? <span className="text-green-400">Connected</span> : <span>Link account</span>}</div></div></div>
                                <button onClick={() => { if (user.spotify?.accessToken) { onUpdateUser({ spotify: undefined }); } else { window.location.href = SpotifyService.getAuthUrl(); } }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${user.spotify?.accessToken ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-[#1DB954] text-black hover:bg-[#1ed760]'}`}>{user.spotify?.accessToken ? 'Unlink' : 'Connect'}</button>
                            </div>
                         </div>
                         <div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Theme Color</h3><div className="flex gap-4">{['blue', 'purple', 'green', 'orange', 'rose'].map((c) => (<button key={c} onClick={() => onUpdateUser({ theme: { ...user.theme, primaryColor: c as any } })} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${user.theme.primaryColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c === 'blue' ? '#3b82f6' : c === 'purple' ? '#9333ea' : c === 'green' ? '#10b981' : c === 'orange' ? '#f97316' : '#f43f5e' }}>{user.theme.primaryColor === c && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</button>))}</div></div>
                         <div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Font Style</h3><div className="grid grid-cols-3 gap-3">{[{ id: 'sans', label: 'Modern' },{ id: 'serif', label: 'Classic' },{ id: 'mono', label: 'Tech' }].map((f) => (<button key={f.id} onClick={() => onUpdateUser({ theme: { ...user.theme, fontFamily: f.id as any } })} className={`py-3 rounded-xl border text-sm transition-all ${user.theme.fontFamily === f.id ? `${styles.colors.bgSoft} ${styles.colors.border} text-white` : 'border-zinc-700 text-zinc-500'}`}><span className={f.id === 'sans' ? 'font-sans' : f.id === 'serif' ? 'font-serif' : 'font-mono'}>{f.label}</span></button>))}</div></div>
                         <div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Card Style</h3><div className="grid grid-cols-1 gap-3">{[{ id: 'glass', label: 'Glassmorphism', desc: 'Blurry, translucent, modern.' },{ id: 'solid', label: 'Solid & Bold', desc: 'High contrast, opaque blocks.' },{ id: 'minimal', label: 'Minimal Outline', desc: 'Wireframe look, no background.' }].map((s) => (<button key={s.id} onClick={() => onUpdateUser({ theme: { ...user.theme, cardStyle: s.id as any } })} className={`p-4 rounded-xl border text-left transition-all ${user.theme.cardStyle === s.id ? `${styles.colors.bgSoft} ${styles.colors.border}` : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}><div className={`text-sm font-medium ${user.theme.cardStyle === s.id ? 'text-white' : 'text-zinc-400'}`}>{s.label}</div><div className="text-xs text-zinc-500 mt-1">{s.desc}</div></button>))}</div></div>
                    </div>
                )}
                
                {settingsTab === 'layout' && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Home Screen Widgets</h3>
                        <div className="space-y-3">
                             {/* Greeting */}
                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                                <span className="text-sm font-medium text-white">Greeting & Hero</span>
                                <button onClick={() => onUpdateUser({ widgets: { ...user.widgets, showGreeting: !user.widgets.showGreeting } })} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${user.widgets.showGreeting ? styles.colors.bg : 'bg-zinc-700'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${user.widgets.showGreeting ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                            </div>
                            {/* Visualizer */}
                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                                <span className="text-sm font-medium text-white">Voice Visualizer</span>
                                <button onClick={() => onUpdateUser({ widgets: { ...user.widgets, showVisualizer: !user.widgets.showVisualizer } })} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${user.widgets.showVisualizer ? styles.colors.bg : 'bg-zinc-700'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${user.widgets.showVisualizer ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                            </div>
                            {/* Sources */}
                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                                <span className="text-sm font-medium text-white">Search Sources</span>
                                <button onClick={() => onUpdateUser({ widgets: { ...user.widgets, showSources: !user.widgets.showSources } })} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${user.widgets.showSources ? styles.colors.bg : 'bg-zinc-700'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${user.widgets.showSources ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                            </div>
                        </div>
                    </div>
                )}
             </div>
        </div>
    </div>
  );


  // --- MAIN RENDER ---
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden relative select-none">
      {/* Background Image Layer - Global */}
      {user.theme.backgroundImage && (
          <>
             <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: `url(${user.theme.backgroundImage})` }}
             ></div>
             {/* Gradient Overlay for Readability */}
             <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 backdrop-blur-[2px]"></div>
          </>
      )}

      {/* Snow Effect Overlay */}
      <SnowEffect />

      {/* DESKTOP SIDEBAR (Visible md+) */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 glass-card border-r border-white/10 z-30 transition-all duration-300 backdrop-blur-2xl bg-black/40">
            <div className="p-6 flex items-center justify-center lg:justify-start gap-4 mb-2">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h1 className="text-xl font-bold hidden lg:block tracking-tight text-white">Rio</h1>
            </div>
            
            <nav className="flex-1 px-3 space-y-2 py-4 overflow-y-auto scrollbar-hide">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? `${styles.colors.bgSoft} ${styles.colors.text} ring-1 ${styles.colors.border}` : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                    >
                        <div className={`p-1 ${activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {item.icon}
                            </svg>
                        </div>
                        <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* User Profile Small at Bottom of Sidebar */}
            <div className="p-4 border-t border-white/10 mt-auto">
                <button 
                    onClick={() => { setEditAvatar(user.avatar || ''); setEditBio(user.bio || ''); setShowSettings(true); }}
                    className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-xl transition-colors"
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ${styles.colors.ring} ring-offset-2 ring-offset-black`}>
                        {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover" /> : user.name[0]}
                    </div>
                    <div className="hidden lg:flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium truncate text-white">{user.name}</span>
                        <span className="text-[10px] text-zinc-500 truncate">Settings</span>
                    </div>
                </button>
            </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative z-20 w-full overflow-hidden">
            {/* MOBILE HEADER (Visible < md) */}
            <header className="px-6 py-6 flex justify-between items-center md:hidden relative z-20 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md">Rio</h1>
                </div>
                <button 
                    onClick={() => { setEditAvatar(user.avatar || ''); setEditBio(user.bio || ''); setShowSettings(true); }}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-semibold text-white hover:bg-white/20 transition-colors overflow-hidden backdrop-blur-md shadow-lg"
                >
                    {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover" /> : user.name[0]}
                </button>
            </header>

            {/* SCROLLABLE CONTENT */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 scrollbar-hide pb-28 md:pb-8 w-full">
                 <div className="max-w-4xl mx-auto w-full h-full">
                    {activeTab === 'home' && renderHome()}
                    {activeTab === 'tasks' && renderList('tasks')}
                    {activeTab === 'reminders' && renderList('reminders')}
                    {activeTab === 'notes' && renderNotes()}
                    {activeTab === 'gallery' && renderGallery()}
                    {activeTab === 'mood' && renderMood()}
                 </div>
            </main>

            {/* MOBILE BOTTOM NAV (Visible < md) */}
            <nav className="md:hidden absolute bottom-8 left-0 right-0 z-40 px-6 pointer-events-none">
                <div className={`${styles.card} pointer-events-auto p-1.5 flex justify-between items-center rounded-2xl shadow-2xl backdrop-blur-xl`}>
                    {navItems.map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300
                                ${activeTab === tab.id ? `${styles.colors.bgSoft} ${styles.colors.text} shadow-inner` : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                        >
                            <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {tab.icon}
                            </svg>
                        </button>
                    ))}
                </div>
            </nav>
      </div>

      {/* Settings Modal (Overlay) */}
      {showSettings && renderSettings()}
    </div>
  );
};

export default Dashboard;