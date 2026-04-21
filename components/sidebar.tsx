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
  Bell,
  Layers,
  X,
  ChevronLeft,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatThread } from '@/lib/agent';
import { cn } from '@/lib/utils';
import UserMenu from './user-menu';
import SkywayPanel from './skyway-panel';
import { useTheme } from './theme-provider';

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
  { icon: Search,    label: 'Explore',  description: 'Marketplace' },
  { icon: Users,     label: 'Sky-Way',  description: 'Your Agents' },
  { icon: FolderOpen,label: 'Library',  description: 'Your Files'  },
  { icon: Layers,    label: 'Spaces',   description: 'Projects'    },
  { icon: Settings,  label: 'Settings', description: 'App Config'  },
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
  const { theme, toggleTheme } = useTheme();

  const handleNavClick = (label: string) => {
    switch (label) {
      case 'Explore':  onOpenExplore?.(); break;
      case 'Sky-Way':  setSkywayOpen(!skywayOpen); break;
      case 'Library':  onOpenLibrary?.(); break;
      case 'Spaces':   onOpenSpaces?.(); break;
      case 'Settings': onOpenSettings?.(); break;
    }
  };

  const isLight = theme === 'light';

  return (
    <motion.div
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'w-56 h-full flex flex-col shrink-0 relative border-r',
        isLight
          ? 'bg-[#ede9e3] border-black/10'
          : 'bg-[#0e0e0f] border-white/5'
      )}
    >
      {/* Sky-Way overlay panel */}
      <AnimatePresence>
        {skywayOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              'absolute inset-0 z-20 flex flex-col',
              isLight ? 'bg-[#ede9e3]' : 'bg-[#0e0e0f]'
            )}
          >
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 border-b shrink-0',
              isLight ? 'border-black/10' : 'border-white/5'
            )}>
              <button
                onClick={() => setSkywayOpen(false)}
                className={cn('p-1 transition-colors', isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-500 hover:text-white')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className={cn('text-xs', isLight ? 'text-gray-600' : 'text-gray-400')}>Back to Chat</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <SkywayPanel onAgentActivated={() => setSkywayOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo + controls */}
      <div className="flex items-center justify-between px-4 py-4">
        {/* Brand */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-1.5">
            {/* Solaris sun icon */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#f05a28] to-[#e03020] shadow-lg shadow-orange-600/40 border border-black/30 flex items-center justify-center">
                <Zap className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className={cn(
              'font-bold text-sm tracking-tight',
              isLight ? 'text-gray-900' : 'text-white'
            )}>
              SolarisAI
            </span>
          </div>
          <span className={cn(
            'text-[9px] font-semibold tracking-widest uppercase ml-7',
            isLight ? 'text-orange-600/70' : 'text-orange-500/60'
          )}>
            by terraGravity
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Light/Dark toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-all border',
              isLight
                ? 'bg-orange-100 border-orange-300 text-orange-600 hover:bg-orange-200'
                : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
            )}
          >
            {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>

          {/* Notifications */}
          <button className={cn(
            'relative p-1 transition-colors',
            isLight ? 'text-gray-500 hover:text-gray-800' : 'text-gray-500 hover:text-gray-300'
          )}>
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#f05a28] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-black/20">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* New Chat CTA */}
      <div className="px-3 mb-4">
        <button
          onClick={() => onNewThread?.()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#f05a28] to-[#e03020] hover:from-[#f06a38] hover:to-[#e04030] text-white font-semibold text-sm transition-all shadow-lg shadow-orange-600/30 border border-black/20"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Nav Items */}
      <nav className="px-2 space-y-0.5 mb-4">
        {navItems.map((item) => {
          const isActive =
            (item.label === 'Explore'  && activePanel === 'explore') ||
            (item.label === 'Sky-Way'  && skywayOpen) ||
            (item.label === 'Library'  && activePanel === 'library') ||
            (item.label === 'Spaces'   && activePanel === 'spaces');
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group border',
                isActive
                  ? isLight
                    ? 'bg-orange-100 border-orange-300 text-gray-900'
                    : 'bg-orange-500/10 border-orange-500/20 text-white'
                  : isLight
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-black/5 border-transparent'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive ? 'text-[#f05a28]' : isLight ? 'text-gray-500 group-hover:text-[#f05a28]' : 'text-gray-500 group-hover:text-[#f05a28]'
              )} />
              <div className="flex-1 text-left">
                <div className="font-medium">{item.label}</div>
                <div className={cn('text-[10px]', isLight ? 'text-gray-400' : 'text-gray-600')}>{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* NimbusClouds link */}
      <div className="px-2 mb-2">
        <Link
          href="/nimbus"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group border border-transparent',
            isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-black/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Zap className={cn('h-4 w-4 shrink-0 transition-colors', isLight ? 'text-gray-500 group-hover:text-[#f05a28]' : 'text-gray-500 group-hover:text-[#f05a28]')} />
          <div className="flex-1 text-left">
            <div className="font-medium">NimbusClouds</div>
            <div className={cn('text-[10px]', isLight ? 'text-gray-400' : 'text-gray-600')}>Background Agents</div>
          </div>
        </Link>
      </div>

      {/* Chats label */}
      <div className="px-4 mb-2">
        <p className={cn('text-xs font-semibold uppercase tracking-wider', isLight ? 'text-gray-400' : 'text-gray-600')}>Chats</p>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {threads.length === 0 ? (
            <div className="text-center py-6 px-3">
              <MessageSquare className={cn('h-8 w-8 mx-auto mb-2 opacity-30', isLight ? 'text-gray-500' : 'text-gray-600')} />
              <p className={cn('text-xs', isLight ? 'text-gray-400' : 'text-gray-600')}>No chats yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border-l-2',
                  activeThreadId === thread.id
                    ? isLight
                      ? 'bg-orange-50 text-gray-900 border-l-[#f05a28]'
                      : 'bg-white/6 text-white border-l-[#f05a28]'
                    : isLight
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-black/5 border-l-transparent'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-transparent'
                )}
                onClick={() => onSelectThread(thread.id)}
              >
                <span className="flex-1 text-xs truncate leading-relaxed">{thread.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); onDeleteThread(thread.id); }}
                >
                  <Trash2 className="h-3 w-3 text-red-400/70 hover:text-red-500" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('px-3 py-3 border-t', isLight ? 'border-black/10' : 'border-white/5')}>
        <UserMenu onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
      </div>
    </motion.div>
  );
}
