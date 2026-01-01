import React, { useState } from 'react';
import { UserProfile, AppData } from '../types';
import { StorageService } from '../services/storage';
import SnowEffect from './SnowEffect';

interface OnboardingProps {
  onComplete: (profile: UserProfile, data?: AppData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('signup');
  const [resetStep, setResetStep] = useState<1 | 2>(1); // 1: Email, 2: Code+Password
  
  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [mode, setMode] = useState<'teen' | 'adult'>('teen'); // Only for signup
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (resetStep === 1) {
        if (!email.trim()) { setError("Please enter your email."); return; }
        
        const user = StorageService.findUserByEmail(email.trim());
        if (user) {
             setSuccessMsg(`Reset code sent to ${email}`);
             // Simulate Email Sending
             setTimeout(() => {
                 alert("RIO SECURITY:\n\nYour password reset code is: 782190");
             }, 500);
             setResetStep(2);
        } else {
            setError("No account found with that email.");
        }
    } else {
        if (resetCode !== '782190') {
            setError("Invalid recovery code.");
            return;
        }
        if (!password.trim() || password.length < 4) {
            setError("Password must be at least 4 characters.");
            return;
        }
        
        const user = StorageService.findUserByEmail(email.trim());
        if (user) {
            StorageService.updatePassword(user.id, password);
            setSuccessMsg("Password reset successfully! Redirecting...");
            setTimeout(() => {
                setAuthMode('login');
                setResetStep(1);
                setResetCode('');
                setPassword('');
                setSuccessMsg('');
                setEmail('');
            }, 2000);
        } else {
            setError("Something went wrong. Try again.");
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authMode === 'login') {
      const result = StorageService.login(email, password);

      if (result) {
        onComplete(result.user, result.data);
      } else {
        setError('Invalid credentials.');
      }
    } else {
      // Signup
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
                
                {authMode === 'reset' ? (
                     <>
                        <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                        <p className="text-zinc-400 text-sm">
                            {resetStep === 1 ? 'Enter your email to receive a code.' : 'Enter the code and your new password.'}
                        </p>
                     </>
                ) : (
                    <>
                        <h2 className="text-3xl font-bold text-white mb-2">{authMode === 'login' ? 'Welcome back' : 'Get started'}</h2>
                        <p className="text-zinc-400 text-sm">
                            {authMode === 'login' ? 'Sign in to continue your journey.' : 'Create your personal AI space.'}
                        </p>
                    </>
                )}
              </div>

              {/* TABS - Only show for Login/Signup */}
              {authMode !== 'reset' && (
                <div className="bg-zinc-900/50 p-1 rounded-xl mb-8 flex relative border border-white/5">
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-zinc-700/80 rounded-lg transition-all duration-300 shadow-sm ${authMode === 'login' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
                    ></div>
                    <button 
                    onClick={() => { setAuthMode('signup'); setError(''); }}
                    className={`flex-1 py-2.5 text-sm font-medium relative z-10 transition-colors ${authMode === 'signup' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                    Sign Up
                    </button>
                    <button 
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className={`flex-1 py-2.5 text-sm font-medium relative z-10 transition-colors ${authMode === 'login' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                    Log In
                    </button>
                </div>
              )}

              {/* FORM */}
              <form onSubmit={authMode === 'reset' ? handleResetSubmit : handleSubmit} className="space-y-4">
                
                {/* SIGNUP: Name */}
                {authMode === 'signup' && (
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

                {/* EMAIL Field (Used in all modes, but label changes) */}
                {(authMode !== 'reset' || resetStep === 1) && (
                    <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">
                        {authMode === 'signup' ? 'Email Address' : (authMode === 'login' ? 'Email or Username' : 'Registered Email')}
                    </label>
                    <input 
                        type={authMode === 'login' ? "text" : "email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder={authMode === 'login' ? "name@example.com" : "name@example.com"}
                        required
                    />
                    </div>
                )}

                {/* SIGNUP: Username */}
                {authMode === 'signup' && (
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

                {/* PASSWORD Field (Login, Signup, Reset Step 2) */}
                {(authMode !== 'reset' || resetStep === 2) && (
                    <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">{authMode === 'reset' ? 'New Password' : 'Password'}</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        placeholder="••••••••"
                        required
                    />
                    </div>
                )}

                {/* RESET: Code Field */}
                {authMode === 'reset' && resetStep === 2 && (
                    <div className="space-y-1 animate-fade-in">
                        <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Recovery Code</label>
                        <input 
                            type="text" 
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-center tracking-widest font-mono"
                            placeholder="000000"
                            required
                        />
                    </div>
                )}

                {/* SIGNUP: Mode Selection */}
                {authMode === 'signup' && (
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

                {/* LOGIN: Forgot Password Link */}
                {authMode === 'login' && (
                    <div className="flex justify-end">
                        <button 
                            type="button"
                            onClick={() => { setAuthMode('reset'); setError(''); setSuccessMsg(''); setEmail(''); }}
                            className="text-xs text-zinc-500 hover:text-white transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                )}

                {/* Messages */}
                {error && <div className="text-red-400 text-xs text-center py-2 bg-red-500/10 rounded-lg border border-red-500/20 animate-fade-in">{error}</div>}
                {successMsg && <div className="text-green-400 text-xs text-center py-2 bg-green-500/10 rounded-lg border border-green-500/20 animate-fade-in">{successMsg}</div>}

                {/* Submit Button */}
                <button 
                  type="submit"
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  {authMode === 'login' ? 'Sign In' : (authMode === 'signup' ? 'Create Account' : (resetStep === 1 ? 'Send Recovery Code' : 'Reset Password'))}
                </button>

                {/* RESET: Cancel Button */}
                {authMode === 'reset' && (
                     <button 
                        type="button"
                        onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
                        className="w-full py-2 text-zinc-500 hover:text-white text-sm transition-colors"
                    >
                        Back to Login
                    </button>
                )}
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