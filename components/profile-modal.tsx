'use client';

/**
 * components/profile-modal.tsx
 * User profile modal with account info and settings.
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Calendar,
  Shield,
  Cloud,
  Check,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'en',
    notifications: true,
    speech_enabled: true,
    auto_save: true,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchSettings();
    }
  }, [isOpen, session?.user?.id]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Profile & Settings</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Profile info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-yellow-500/30">
                    <AvatarImage src={session.user.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-lg font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium text-white">{session.user.name}</h3>
                    <p className="text-sm text-gray-500">{session.user.email}</p>
                  </div>
                </div>

                {/* Account details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-400">{session.user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-400">Password protected</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Cloud className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-400">Cloudreve storage connected</span>
                  </div>
                </div>

                {/* Settings toggles */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-sm font-medium text-gray-300">Preferences</h4>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-400">Auto-save conversations</span>
                    <button
                      onClick={() => setSettings((s) => ({ ...s, auto_save: !s.auto_save }))}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        settings.auto_save ? 'bg-yellow-500' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          settings.auto_save ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-400">Voice input enabled</span>
                    <button
                      onClick={() => setSettings((s) => ({ ...s, speech_enabled: !s.speech_enabled }))}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        settings.speech_enabled ? 'bg-yellow-500' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          settings.speech_enabled ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-400">Notifications</span>
                    <button
                      onClick={() => setSettings((s) => ({ ...s, notifications: !s.notifications }))}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        settings.notifications ? 'bg-yellow-500' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          settings.notifications ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
