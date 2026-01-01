import React from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, isSpeaking }) => {
  // Volume scaling: Only apply when speaking to keep it "static" (shape-wise) when just listening/thinking
  // However, we still want the orb to exist.
  // The 'floating' is handled by the container class `animate-float`.
  
  const scale = isActive && isSpeaking ? 1 + volume * 1.5 : 1;
  const brightness = isActive && isSpeaking ? 1 + volume : 1;
  
  return (
    <div className="flex items-center justify-center h-56 w-full transition-all duration-500 relative perspective-[1000px]">
      
      {!isActive && (
         <div className="relative w-32 h-32 flex items-center justify-center transition-all duration-500 opacity-60 hover:opacity-100 hover:scale-105 cursor-pointer animate-float">
             <div className="absolute inset-0 bg-zinc-800 rounded-full border border-white/10 shadow-lg"></div>
             <div className="text-zinc-400 text-xs font-medium tracking-widest uppercase animate-pulse relative z-10">Offline</div>
         </div>
      )}

      {isActive && (
        <div className="relative flex items-center justify-center animate-float">
            {/* Core Glowing Orb */}
            <div 
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_60px_rgba(168,85,247,0.5)] z-20 transition-all duration-100 ease-out`}
                style={{ 
                    transform: `scale(${scale})`,
                    filter: `brightness(${brightness})`
                }}
            >
                <div className="absolute inset-0 bg-white/20 rounded-full backdrop-blur-[1px]"></div>
            </div>

            {/* Inner Ring (Rotates) */}
            <div 
                className="absolute inset-0 z-10 rounded-full opacity-70 mix-blend-screen pointer-events-none"
                style={{
                    border: '2px solid rgba(255,255,255,0.3)',
                    width: '6rem',
                    height: '6rem',
                    transform: `scale(${scale * 1.2}) rotate(${Date.now() / 50}deg)`,
                    transition: 'transform 0.1s ease-out'
                }}
            ></div>

             {/* Outer Field (Subtle Expansion) */}
             <div 
                className="absolute z-0 bg-blue-600/20 rounded-full blur-3xl pointer-events-none transition-all duration-300 ease-out"
                 style={{
                    width: '6rem',
                    height: '6rem',
                    transform: `scale(${isSpeaking ? 1.5 + volume * 3 : 1.2})`,
                    opacity: isSpeaking ? 0.5 : 0.2
                }}
            ></div>
            
            <div className="absolute -bottom-12 text-center w-40">
                {isSpeaking ? (
                    <span className="text-white/70 text-[10px] font-mono tracking-[0.3em] uppercase animate-pulse">Speaking</span>
                ) : (
                    <span className="text-blue-400/70 text-[10px] font-mono tracking-[0.3em] uppercase">Listening</span>
                )}
            </div>
        </div>
      )}
      
      {!isActive && (
        <div className="absolute mt-32 text-zinc-500 text-xs font-medium tracking-wide">
            Tap to wake Rio
        </div>
      )}
    </div>
  );
};

export default Visualizer;