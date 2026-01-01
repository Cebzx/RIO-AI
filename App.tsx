import React, { useState, useEffect } from 'react';
import { UserProfile, Task, Reminder, Note, MoodEntry, GalleryItem, AppData } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Initialize and Load Data
  useEffect(() => {
    // Attempt migration first
    StorageService.migrate();

    // Check for active session
    const session = StorageService.getSession();
    if (session) {
      setUser(session);
      const data = StorageService.loadUserData(session.id);
      setTasks(data.tasks);
      setReminders(data.reminders);
      setNotes(data.notes);
      setMoodHistory(data.moods);
      setGallery(data.gallery);
    }
  }, []);

  // Save changes whenever state updates
  useEffect(() => { if (user) StorageService.saveData(user.id, 'tasks', tasks); }, [tasks, user]);
  useEffect(() => { if (user) StorageService.saveData(user.id, 'reminders', reminders); }, [reminders, user]);
  useEffect(() => { if (user) StorageService.saveData(user.id, 'notes', notes); }, [notes, user]);
  useEffect(() => { if (user) StorageService.saveData(user.id, 'moods', moodHistory); }, [moodHistory, user]);
  useEffect(() => { 
      if (user) {
          try {
             StorageService.saveData(user.id, 'gallery', gallery); 
          } catch (e) {
             console.error("Storage limit reached");
          }
      }
  }, [gallery, user]);

  const handleOnboardingComplete = (profile: UserProfile, data?: AppData) => {
    setUser(profile);
    if (data) {
        setTasks(data.tasks);
        setReminders(data.reminders);
        setNotes(data.notes);
        setMoodHistory(data.moods);
        setGallery(data.gallery);
    }
  };

  const handleUpdateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        StorageService.saveUser(updated);
        return updated;
    });
  };

  const handleLogout = () => {
    StorageService.logout();
    setUser(null);
    setTasks([]);
    setReminders([]);
    setNotes([]);
    setMoodHistory([]);
    setGallery([]);
  };

  if (!user) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Inject dynamic font class based on user preference
  const fontClass = {
    'sans': 'font-sans',
    'serif': 'font-serif',
    'mono': 'font-mono'
  }[user.theme.fontFamily];

  return (
    <div className={`min-h-screen text-white selection:bg-white/20 selection:text-white overflow-hidden ${fontClass}`}>
        {/* API Key Check Overlay */}
        {!process.env.API_KEY && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-zinc-900 p-6 border border-red-500/20 rounded-2xl max-w-sm text-center shadow-2xl">
                    <h2 className="text-red-400 font-semibold text-lg mb-2">Configuration Error</h2>
                    <p className="text-zinc-400 text-sm">
                        API Key not detected. Please verify <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">process.env.API_KEY</code> is set.
                    </p>
                </div>
            </div>
        )}
        
        <Dashboard 
            user={user} 
            tasks={tasks} 
            setTasks={setTasks} 
            reminders={reminders}
            setReminders={setReminders}
            notes={notes}
            setNotes={setNotes}
            moodHistory={moodHistory}
            setMoodHistory={setMoodHistory}
            gallery={gallery}
            setGallery={setGallery}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
        />
    </div>
  );
};

export default App;