
"use client";

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const confettiColors = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
];

const ConfettiPiece = ({ x, y, rotate, color }: { x: number; y: number; rotate: number; color: string }) => {
  return (
    <motion.div
      className="absolute w-2 h-4"
      style={{
        left: '50%',
        top: '50%',
        backgroundColor: color,
        x,
        y,
        rotate,
      }}
      initial={{ opacity: 1, scale: 1 }}
      animate={{
        y: '100vh',
        opacity: [1, 1, 0],
        scale: [1, 0.5, 0],
        rotate: rotate + (Math.random() - 0.5) * 720,
      }}
      transition={{
        duration: Math.random() * 2 + 3, // 3-5 seconds
        ease: 'easeOut',
      }}
    />
  );
};


const ConfettiBurst = ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
  const pieces = Array.from({ length: 150 }).map((_, i) => {
    const angle = (i / 150) * Math.PI * 2;
    const radius = Math.random() * 1000 + 200;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotate: Math.random() * 360,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    };
  });

  // Use a timeout to call onAnimationComplete after the longest possible animation duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 5000); // Max duration of a confetti piece is 5s
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {pieces.map((piece, i) => (
          <ConfettiPiece key={i} {...piece} />
        ))}
      </div>
    </AnimatePresence>
  );
};

// Main component that uses a Portal
const Confetti = ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
    if (typeof document === "undefined") {
        return null;
    }
    return createPortal(
        <ConfettiBurst onAnimationComplete={onAnimationComplete} />,
        document.body
    );
};


export default Confetti;
