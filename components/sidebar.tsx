'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  FolderOpen,
  Settings,
  MessageSquare,
  Trash2,
  Menu,
  Cloud,
  Bell,
  Layers,
  X,
  ChevronLeft,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatThread } from '@/lib/agent';
import { cn } from '@/lib/utils';
import UserMenu from './user-menu';
import SkywayPanel from './skyway-panel';

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenExplore?: () => void;
  onOpenSkyWay?: () => void;
  onOpenLibrary?: () => void;
  onOpenSpaces?: () => void;
  notificationCount?: number;
  activePanel?: string | null;
}

const navItems = [
  { icon: Search, label: 'Explore', description: 'Marketplace' },
  { icon: Users, label: 'Sky-Way', description: 'Your Agents' },
  { icon: FolderOpen, label: 'Library', description: 'Your Files' },
  { icon: Layers, label: 'Spaces', description: 'Projects' },
  { icon: Settings, label: 'Settings', description: 'App Config' },
];

export default function Sidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onOpenProfile,
  onOpenSettings,
  onOpenExplore,
  onOpenSkyWay,
  onOpenLibrary,
  onOpenSpaces,
  notificationCount = 0,
  activePanel,
}: SidebarProps) {
  const [skywayOpen, setSkywayOpen] = useState(false);

  const handleNavClick = (label: string) => {
    switch (label) {
      case 'Explore': onOpenExplore?.(); break;
      case 'Sky-Way': setSkywayOpen(!skywayOpen); break;
      case 'Library': onOpenLibrary?.(); break;
      case 'Spaces': onOpenSpaces?.(); break;
      case 'Settings': onOpenSettings?.(); break;
    }
  };

  return (
    <motion.div
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-56 h-full bg-[#0a0a0a] border-r border-white/5 flex flex-col shrink-0 relative"
    >
      {/* Sky-Way overlay panel */}
      <AnimatePresence>
        {skywayOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 z-20 bg-[#0a0a0a] flex flex-col"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
              <button
                onClick={() => setSkywayOpen(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-400">Back to Chat</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <SkywayPanel onAgentActivated={() => setSkywayOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo + Notifications */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-yellow-400" strokeWidth={1.5} />
          <span className="font-semibold text-white text-sm tracking-wide">Nimbus AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative text-gray-500 hover:text-gray-300 transition-colors p-1">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Chat CTA */}
      <div className="px-3 mb-4">
        <button
          onClick={() => onNewThread?.()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-semibold text-sm transition-all shadow-lg shadow-yellow-500/20"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Nav Items */}
      <nav className="px-2 space-y-0.5 mb-4">
        {navItems.map((item) => {
          const isActive =
            (item.label === 'Explore' && activePanel === 'explore') ||
            (item.label === 'Sky-Way' && skywayOpen) ||
            (item.label === 'Library' && activePanel === 'library') ||
            (item.label === 'Spaces' && activePanel === 'spaces');
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group',
                isActive
                  ? 'bg-yellow-500/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive ? 'text-yellow-400' : 'text-gray-500 group-hover:text-yellow-400'
              )} />
              <div className="flex-1 text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-[10px] text-gray-600">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Chats label */}
      <div className="px-4 mb-2">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Chats</p>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {threads.length === 0 ? (
            <div className="text-center text-gray-600 py-6 px-3">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No chats yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                  activeThreadId === thread.id
                    ? 'bg-white/8 text-white border-l-2 border-yellow-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent'
                )}
                onClick={() => onSelectThread(thread.id)}
              >
                <span className="flex-1 text-xs truncate leading-relaxed">{thread.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); onDeleteThread(thread.id); }}
                >
                  <Trash2 className="h-3 w-3 text-red-400/70 hover:text-red-400" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/5">
        <UserMenu onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
      </div>
    </motion.div>
  );
}
