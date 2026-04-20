'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Copy, Check } from 'lucide-react';
import { createSkyNote } from '@/lib/features';

interface SelectionToolbarProps {
  threadId?: string;
  onNoteSaved?: () => void;
}

interface ToolbarPos { x: number; y: number; text: string }

export default function SelectionToolbar({ threadId, onNoteSaved }: SelectionToolbarProps) {
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      // Small delay so selection is finalized
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || text.length < 10) { setPos(null); return; }

        // Only show inside the chat messages area
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (!rect) return;

        setPos({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
        setSaved(false);
        setCopied(false);
        setShowNoteForm(false);
        setNoteTitle('');
      }, 10);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setPos(null);
      setShowNoteForm(false);
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const handleCopy = () => {
    if (!pos) return;
    navigator.clipboard.writeText(pos.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNote = () => {
    if (!pos) return;
    const title = noteTitle.trim() || pos.text.slice(0, 50) + (pos.text.length > 50 ? '...' : '');
    createSkyNote(title, pos.text, isGlobal, isGlobal ? undefined : threadId);
    setSaved(true);
    setShowNoteForm(false);
    onNoteSaved?.();
    setTimeout(() => { setSaved(false); setPos(null); }, 1500);
  };

  if (!pos) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        className="fixed z-50 pointer-events-auto"
        style={{
          left: Math.min(Math.max(pos.x - 80, 8), window.innerWidth - 200),
          top: pos.y - (showNoteForm ? 120 : 44),
        }}
      >
        {/* Note form */}
        <AnimatePresence>
          {showNoteForm && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="mb-1.5 bg-[#1a1a1a] border border-purple-500/30 rounded-xl p-2.5 shadow-xl w-52"
            >
              <input
                autoFocus
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                placeholder="Note title (optional)..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-purple-500/40 mb-2"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsGlobal(!isGlobal)}>
                  <div className={`w-6 h-3 rounded-full transition-all relative ${isGlobal ? 'bg-yellow-400' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${isGlobal ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-[10px] text-gray-500">Global</span>
                </label>
                <button
                  onClick={handleSaveNote}
                  className="text-xs bg-purple-500 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-purple-400 transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar pill */}
        <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-white/15 rounded-xl px-1.5 py-1 shadow-xl shadow-black/50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/8 transition-all"
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all ${
              saved
                ? 'text-green-400'
                : showNoteForm
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-gray-300 hover:text-purple-400 hover:bg-white/8'
            }`}
          >
            {saved ? <Check className="h-3 w-3" /> : <StickyNote className="h-3 w-3" />}
            {saved ? 'Saved!' : 'SkyNote'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
