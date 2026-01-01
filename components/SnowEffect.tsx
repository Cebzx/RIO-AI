import React, { useEffect, useRef } from 'react';

const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const snowflakes: {x: number, y: number, r: number, s: number}[] = [];
    const maxFlakes = 40; // Minimal count for subtle effect

    // Initialize flakes
    for(let i = 0; i < maxFlakes; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 0.5, // Radius: 0.5px to 2.5px
        s: Math.random() * 0.5 + 0.2 // Speed: Slow fall
      });
    }

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)"; // Low opacity white
      ctx.beginPath();
      
      for(let i = 0; i < maxFlakes; i++) {
        const p = snowflakes[i];
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
      }
      ctx.fill();
      move();
      animationId = requestAnimationFrame(draw);
    }

    let angle = 0;
    const move = () => {
      angle += 0.01;
      for(let i = 0; i < maxFlakes; i++) {
        const p = snowflakes[i];
        p.y += p.s;
        p.x += Math.sin(angle + p.r) * 0.3; // Gentle sway
        
        // Reset if moved off screen
        if(p.y > height) {
          snowflakes[i] = { x: Math.random() * width, y: -5, r: p.r, s: p.s };
        }
      }
    }

    const handleResize = () => {
        if (!canvas) return;
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    };
    
    window.addEventListener('resize', handleResize);
    draw();

    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
    }
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1] w-full h-full" />;
};

export default SnowEffect;