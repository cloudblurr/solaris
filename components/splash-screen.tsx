'use client';

import { motion } from 'framer-motion';
import { Zap, Sparkles, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [showModeSelect, setShowModeSelect] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowModeSelect(true), 400);
          return 100;
        }
        return prev + 2;
      });
    }, 28);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0e0e0f 0%, #1a0a05 50%, #0e0e0f 100%)' }}
    >
      {!showModeSelect ? (
        <div className="text-center select-none">
          {/* Animated ring */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute"
            >
              <div className="h-36 w-36 rounded-full border-4 border-transparent"
                style={{ borderTopColor: '#f05a28', borderRightColor: 'rgba(240,90,40,0.2)' }} />
            </motion.div>

            {/* Core icon */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f05a28] to-[#e03020] flex items-center justify-center shadow-2xl border-2 border-black/40"
                style={{ boxShadow: '0 0 40px rgba(240,90,40,0.5)' }}>
                <Zap className="h-10 w-10 text-white" strokeWidth={2} />
              </div>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="h-6 w-6 text-orange-300" />
              </motion.div>
            </div>
          </motion.div>

          {/* Brand name */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-black mb-1 tracking-tight"
              style={{ background: 'linear-gradient(135deg, #f05a28, #ff8c5a, #e03020)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SolarisAI
            </h1>
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-orange-500/60 mb-6">
              by terraGravity
            </p>
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-orange-300/50 mb-8 text-sm"
          >
            Initializing Intelligence...
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6 }}
            className="w-64 h-1.5 rounded-full overflow-hidden mx-auto border border-black/30"
            style={{ background: 'rgba(240,90,40,0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f05a28, #e03020)',
                boxShadow: '0 0 8px rgba(240,90,40,0.6)',
                transition: 'width 0.1s linear',
              }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-orange-500/40 mt-3 text-xs font-mono"
          >
            {progress}%
          </motion.p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-6">
            <h2 className="text-4xl font-black text-white mb-2">Ready</h2>
            <p className="text-orange-400/60 text-sm tracking-widest uppercase">SolarisAI · terraGravity</p>
          </div>

          <div className="flex gap-6 justify-center">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onComplete}
              className="w-64 h-44 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-shadow border-2 border-black/30"
              style={{
                background: 'linear-gradient(135deg, #f05a28, #e03020)',
                boxShadow: '0 20px 60px rgba(240,90,40,0.4)',
              }}
            >
              <MessageSquare className="w-14 h-14 text-white" strokeWidth={1.5} />
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Agent Mode</h3>
                <p className="text-white/70 text-xs">AI assistant for tasks, coding & productivity</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
