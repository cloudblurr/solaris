'use client';

import { motion } from 'framer-motion';
import { Cloud, Sparkles, MessageSquare, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowModeSelect(true), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-black"
    >
      {!showModeSelect ? (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-32 w-32 rounded-full border-4 border-blue-500/30 border-t-yellow-500" />
            </motion.div>
            
            <div className="relative flex items-center justify-center h-32 w-32 mx-auto">
              <Cloud className="h-20 w-20 text-blue-400" strokeWidth={1.5} />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute"
              >
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-300 to-yellow-400 bg-clip-text text-transparent"
          >
            Nimbus AI
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-blue-300/70 mb-8 text-lg"
          >
            Initializing Intelligence...
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7 }}
            className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-yellow-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-blue-400/50 mt-4 text-sm"
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
          <h2 className="text-4xl font-bold text-white mb-4">Choose Your Mode</h2>
          <p className="text-white/60 mb-12">Select how you want to use Nimbus AI</p>

          <div className="flex gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="w-64 h-48 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:shadow-2xl hover:shadow-blue-500/50 transition-shadow"
            >
              <MessageSquare className="w-16 h-16 text-white" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Agent Mode</h3>
                <p className="text-white/80 text-sm">AI assistant for tasks, coding, and productivity</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/roleplay')}
              className="w-64 h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:shadow-2xl hover:shadow-purple-500/50 transition-shadow"
            >
              <Users className="w-16 h-16 text-white" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Roleplay Mode</h3>
                <p className="text-white/80 text-sm">Immersive character-driven storytelling</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
