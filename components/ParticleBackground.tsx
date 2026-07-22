"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId: number;

    let mouseX = -1000;
    let mouseY = -1000;
    let hasMouse = false;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Increase number of dots by reducing the divisor
      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 500);
      particles = [];
      
      const colors = ["#4285F4", "#EA4335", "#FBBC05", "#A142F4", "#1a1a1a"];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          baseVx: (Math.random() - 0.5) * 0.5,
          baseVy: (Math.random() - 0.5) * 0.5,
          // Make dots smaller
          radius: Math.random() * 1.2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        p.x += p.baseVx;
        p.y += p.baseVy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Visual "lift" effect (zoom in when close to cursor)
        let zoomScale = 1;
        let opacity = 0.3; // base opacity (increased by 10%)
        if (hasMouse) {
           const mdx = mouseX - p.x;
           const mdy = mouseY - p.y;
           const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
           if (mdist < 150) {
              const proximity = (150 - mdist) / 150;
              // Zoom in up to 2.5x normal size
              zoomScale = 1 + (1.5 * proximity);
              // Increase opacity by 10% based on proximity
              opacity = Math.min(1, 0.3 + (0.1 * proximity));
           }
        }

        const currentRadius = p.radius * zoomScale;

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.fill();

        // Lines removed as requested.
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      hasMouse = true;
    };
    
    const handleMouseLeave = () => {
      hasMouse = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.8
      }}
    />
  );
}
