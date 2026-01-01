import React, { useState } from 'react';
import { UserProfile, AppData } from '../types';
import { StorageService } from '../services/storage';
import SnowEffect from './SnowEffect';

interface OnboardingProps {
  onComplete: (profile: UserProfile, data?: AppData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [isLogin, setIsLogin] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [mode, setMode] = useState<'teen' | 'adult'>('teen'); // Only for signup
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const result = StorageService.login(email, password);

      if (result) {
        onComplete(result.user, result.data);
      } else {
        setError('Invalid credentials.');
      }
    } else {
      if (!name.trim() || !username.trim() || !password.trim() || !email.trim()) {
        setError('Please fill in all fields.');
        return;
      }
      
      // Check duplicate
      const users = StorageService.getUsers();
      if (users.find(u => u.username === username || u.email === email)) {
        setError('Account already exists.');
        return;
      }

      const newUser: UserProfile & { password: string } = {
        id: Date.now().toString(),
        name,
        username,
        email,
        password,
        isAdultMode: mode === 'adult',
        isHandsFree: false,
        setupComplete: true,
        theme: {
            primaryColor: 'blue',
            fontFamily: 'sans',
            cardStyle: 'glass'
        },
        widgets: {
            showVisualizer: true,
            showMood: true,
            showSources: true,
            showGreeting: true
        }
      };

      StorageService.saveUser(newUser);
      
      const { password: _, ...profile } = newUser;
      onComplete(profile);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/80"></div>
      <SnowEffect />

      {/* DESKTOP LEFT SIDE: Marketing/Hero */}
      <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 relative z-10">
        <div className="max-w-xl">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mb-8 shadow-2xl shadow-blue-500/20 flex items-center justify-center animate-float">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Rio</span>.
            </h1>
            <p className="text-xl text-zinc-300 mb-12 leading-relaxed">
              Your intelligent voice-first companion. <br/>
              Organize your life, track your mood, and clear your mind with natural conversation.
            </p>

            <div className="grid grid-cols-2 gap-6">
                {[
                    { title: "Voice Native", desc: "Powered by Gemini Live for real-time interaction.", icon: "🎙️" },
                    { title: "Context Aware", desc: "Remembers your tasks, notes, and preferences.", icon: "🧠" },
                    { title: "Spotify Sync", desc: "Control your music and discover new tracks.", icon: "🎵" },
                    { title: "Mood Tracking", desc: "Visualize your emotional journey over time.", icon: "📊" }
                ].map((feature, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="text-2xl mb-2">{feature.icon}</div>
                        <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                        <p className="text-xs text-zinc-400">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* RIGHT SIDE (Mobile: Full Screen / Desktop: Side Panel): Auth Form */}
      <div className="w-full md:w-[480px] flex flex-col justify-center p-6 sm:p-12 relative z-20 bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-2xl">
          <div className="w-full max-w-sm mx-auto">
              <div className="mb-8 text-center md:text-left">
                {/* Mobile Logo Only */}
                <div className="md:hidden w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 shadow-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome back' : 'Get started'}</h2>
                <p className="text-zinc-400 text-sm">
                    {isLogin ? 'Sign in to continue your journey.' : 'Create your personal AI space.'}
                </p>
              </div>

              <div className="bg-zinc-900/50 p-1 rounded-xl mb-8 flex relative border border-white/5">
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-700/80 rounded-lg transition-all duration-300 shadow-sm ${isLogin ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
                ></div>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-medium relative z-10 transition-colors ${!isLogin ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Sign Up
                </button>
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-medium relative z-10 transition-colors ${isLogin ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Log In
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="animate-fade-in space-y-1">
                     <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Full Name</label>
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                       placeholder="Enter your name"
                     />
                  </div>
                )}

                <div className="space-y-1">
                   <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Email or Username</label>
                   <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                     placeholder="name@example.com"
                     required
                   />
                </div>

                {!isLogin && (
                   <div className="animate-fade-in space-y-1">
                     <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Username</label>
                     <input 
                       type="text" 
                       value={username}
                       onChange={(e) => setUsername(e.target.value)}
                       className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                       placeholder="Choose a handle"
                     />
                   </div>
                )}

                <div className="space-y-1">
                   <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Password</label>
                   <input 
                     type="password" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                     placeholder="••••••••"
                     required
                   />
                </div>

                {/* Mode Selection - Signup Only */}
                {!isLogin && (
                  <div className="pt-2 animate-fade-in">
                    <p className="text-xs font-semibold text-zinc-500 mb-2 ml-1 uppercase tracking-wider">Personality Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setMode('teen')}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${mode === 'teen' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900/30 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800'}`}
                        >
                          <span>Safe Mode</span>
                          <span className="text-[10px] opacity-60 font-normal">Supportive & Clean</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('adult')}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${mode === 'adult' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-zinc-900/30 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800'}`}
                        >
                          <span>Unfiltered</span>
                          <span className="text-[10px] opacity-60 font-normal">Raw & Expressive</span>
                        </button>
                    </div>
                  </div>
                )}

                {error && <div className="text-red-400 text-xs text-center py-2 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}

                <button 
                  type="submit"
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>
              
              <div className="mt-8 text-center">
                  <p className="text-[10px] text-zinc-600">
                      By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Onboarding;