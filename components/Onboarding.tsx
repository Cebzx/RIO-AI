import React, { useState } from 'react';
import { UserProfile, AppData } from '../types';
import { StorageService } from '../services/storage';

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto relative z-10">
      <div className="w-full">
          <div className="mb-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 shadow-xl shadow-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white">Rio</h1>
            <p className="text-zinc-400 text-sm">Your intelligent daily companion.</p>
          </div>

          <div className="glass-card p-1 rounded-2xl mb-8 flex relative">
            <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-800 rounded-xl transition-all duration-300 shadow-sm ${isLogin ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
            ></div>
            <button 
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium relative z-10 transition-colors ${!isLogin ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Sign Up
            </button>
            <button 
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium relative z-10 transition-colors ${isLogin ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Log In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="animate-fade-in">
                 <input 
                   type="text" 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                   placeholder="Full Name"
                 />
              </div>
            )}

            <div>
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                 placeholder="Email or Username"
                 required
               />
            </div>

            {!isLogin && (
               <div className="animate-fade-in">
                 <input 
                   type="text" 
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                   placeholder="Username"
                 />
               </div>
            )}

            <div>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                 placeholder="Password"
                 required
               />
            </div>

            {/* Mode Selection - Signup Only */}
            {!isLogin && (
              <div className="pt-2 animate-fade-in">
                <p className="text-xs font-medium text-zinc-500 mb-2 ml-1">Assistance Mode</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('teen')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${mode === 'teen' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500'}`}
                    >
                      Safe Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('adult')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${mode === 'adult' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500'}`}
                    >
                      Unfiltered
                    </button>
                </div>
              </div>
            )}

            {error && <div className="text-red-400 text-sm text-center py-2 bg-red-500/10 rounded-lg">{error}</div>}

            <button 
              type="submit"
              className="w-full mt-4 bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
      </div>
    </div>
  );
};

export default Onboarding;