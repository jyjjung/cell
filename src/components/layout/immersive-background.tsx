"use client";

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function ImmersiveBackground() {
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const springX = useSpring(0, { stiffness: 50, damping: 35 });
    const springY = useSpring(0, { stiffness: 50, damping: 35 });

    const x = useTransform(springX, (val) => val - 450);
    const y = useTransform(springY, (val) => val - 450);

    useEffect(() => {
        setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        const handleMouseMove = (e: MouseEvent) => {
            springX.set(e.clientX);
            springY.set(e.clientY);
        };
        if (!isTouchDevice) {
            window.addEventListener('mousemove', handleMouseMove, { passive: true });
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [springX, springY, isTouchDevice]);

    return (
        <>
            {/* Cursor glow — follows mouse */}
            {!isTouchDevice && (
                <motion.div
                    className="pointer-events-none fixed top-0 left-0 w-[900px] h-[900px] z-0 rounded-full"
                    style={{
                        x,
                        y,
                        background: 'radial-gradient(circle, hsla(var(--primary), 0.08) 0%, transparent 65%)',
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
                    }}
                />
            )}

            {/* Atmospheric layer */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-background">

                {/* Blob 1 — New Dream Blue, top-left */}
                <motion.div
                    animate={{
                        x: [-80, 120, -80],
                        y: [-40, 80, -40],
                        scale: [1, 1.1, 1],
                        opacity: [0.35, 0.55, 0.35],
                    }}
                    transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-[20%] -left-[10%] w-[1000px] h-[1000px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, hsla(var(--primary), 0.3) 0%, transparent 70%)',
                        filter: 'blur(100px)',
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                    }}
                />

                {/* Blob 2 — Sky Blue, bottom-right */}
                <motion.div
                    animate={{
                        x: [160, -120, 160],
                        y: [100, -60, 100],
                        scale: [1.15, 0.95, 1.15],
                        opacity: [0.2, 0.38, 0.2],
                    }}
                    transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
                    className="absolute -bottom-[20%] -right-[10%] w-[1100px] h-[1100px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, #0ea5e955 0%, transparent 70%)',
                        filter: 'blur(120px)',
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                    }}
                />

                {/* Blob 3 — Indigo depth, center-right */}
                <motion.div
                    animate={{
                        scale: [1, 1.25, 1],
                        x: [80, -80, 80],
                        opacity: [0.12, 0.28, 0.12],
                    }}
                    transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-[10%] right-[0%] w-[800px] h-[800px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, #3b82f644 0%, transparent 70%)',
                        filter: 'blur(110px)',
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                    }}
                />

                {/* Blob 4 — Subtle Emerald warmth, bottom-left */}
                <motion.div
                    animate={{
                        x: [-60, 100, -60],
                        y: [60, -40, 60],
                        opacity: [0.1, 0.22, 0.1],
                    }}
                    transition={{ duration: 42, repeat: Infinity, ease: 'linear', delay: 5 }}
                    className="absolute bottom-[5%] left-[10%] w-[700px] h-[700px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, #10b98133 0%, transparent 70%)',
                        filter: 'blur(100px)',
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                    }}
                />

                {/* Grain texture */}
                <div
                    className="absolute inset-0 opacity-[0.055]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '200px',
                        mixBlendMode: 'overlay',
                    }}
                />

                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-transparent to-background/40 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
            </div>
        </>
    );
}
