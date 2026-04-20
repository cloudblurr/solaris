'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Check, X, Copy, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SkyNote,
  getSkyNotes, saveSkyNote, deleteSkyNote, createSkyNote,
} from '@/lib/features';

interface SkyNotesPanelProps {
  threadId?: string;
  onRefresh?: () => void;
}

// ── Note card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onUpdate, onDelete }: {
  note: SkyNote;
  onUpdate: (n: SkyNote) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleVal, setTitleVal] = useState(note.title);
  const [contentVal, setContentVal] = useState(note.content);
  const [contextVal, setContextVal] = useState(note.context || '');
  const [copied, setCopied] = useState(false);

  const save = () => {
    onUpdate({ ...note, title: titleVal, content: contentVal, context: contextVal, updatedAt: new Date() });
    setEditing(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(
      `${note.title}\n\n${note.content}${note.context ? `\n\nContext: ${note.context}` : ''}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111] border border-white/8 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => !editing && setExpanded(!expanded)}
      >
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', note.isGlobal ? 'bg-yellow-400' : 'bg-purple-400')} />
        <span className="flex-1 text-xs font-medium text-gray-200 truncate">{note.title}</span>
        <span className="text-[10px] text-gray-600 shrink-0">{note.isGlobal ? 'Global' : 'Chat'}</span>
        <button onClick={e => { e.stopPropagation(); copy(); }} className="text-gray-600 hover:text-gray-300 transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setEditing(!editing); setExpanded(true); }}
          className="text-gray-600 hover:text-gray-300 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(note.id); }}
          className="text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-600" /> : <ChevronDown className="h-3 w-3 text-gray-600" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {editing ? (
                <>
                  <input
                    value={titleVal}
                    onChange={e => setTitleVal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500/40"
                    placeholder="Title..."
                  />
                  <textarea
                    value={contentVal}
                    onChange={e => setContentVal(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-purple-500/40 resize-none"
                    placeholder="Note content..."
                  />
                  <input
                    value={contextVal}
                    onChange={e => setContextVal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 outline-none focus:border-purple-500/40"
                    placeholder="Additional context (optional)..."
                  />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Cancel</button>
                    <button onClick={save} className="text-xs bg-purple-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-purple-400 transition-all">Save</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  {note.context && (
                    <div className="bg-white/3 border border-white/6 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Context</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{note.context}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-700">{new Date(note.updatedAt).toLocaleDateString()}</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function SkyNotesPanel({ threadId, onRefresh }: SkyNotesPanelProps) {
  const [notes, setNotes] = useState<SkyNote[]>(() => getSkyNotes(threadId));
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newGlobal, setNewGlobal] = useState(false);

  const refreshNotes = () => setNotes(getSkyNotes(threadId));

  // Re-read when a note is saved externally (e.g. from chat selection toolbar)
  useEffect(() => {
    refreshNotes();
  }, [threadId]);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    createSkyNote(
      newTitle.trim(),
      newContent.trim(),
      newGlobal,
      newGlobal ? undefined : threadId,
      newContext.trim() || undefined
    );
    setNewTitle('');
    setNewContent('');
    setNewContext('');
    setCreating(false);
    refreshNotes();
  };

  const handleUpdate = (n: SkyNote) => { saveSkyNote(n); refreshNotes(); };
  const handleDelete = (id: string) => { deleteSkyNote(id); refreshNotes(); };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">SkyNotes</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Capture & save insights</p>
        </div>
        <button
          onClick={() => { refreshNotes(); setCreating(true); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Hint about selection */}
      <div className="mx-3 mt-3 bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2 shrink-0">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          <span className="text-purple-400 font-medium">Tip:</span> Highlight any text in the chat to instantly save it as a SkyNote.
        </p>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/6 mt-3"
          >
            <div className="px-4 py-3 space-y-2">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-purple-500/40"
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={3}
                placeholder="Note content..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-600 outline-none focus:border-purple-500/40 resize-none"
              />
              <input
                value={newContext}
                onChange={e => setNewContext(e.target.value)}
                placeholder="Context (optional)..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 placeholder:text-gray-600 outline-none focus:border-purple-500/40"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setNewGlobal(!newGlobal)}>
                  <div className={cn('w-8 h-4 rounded-full transition-all relative', newGlobal ? 'bg-yellow-400' : 'bg-white/10')}>
                    <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', newGlobal ? 'left-[18px]' : 'left-0.5')} />
                  </div>
                  <span className="text-xs text-gray-400">Global note</span>
                </label>
                <div className="flex gap-1.5">
                  <button onClick={() => setCreating(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Cancel</button>
                  <button onClick={handleCreate} className="text-xs bg-purple-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-purple-400 transition-all">Save</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {notes.length === 0 ? (
          <div className="text-center py-10">
            <StickyNote className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No notes yet</p>
            <p className="text-[11px] text-gray-600 mt-1">Highlight text in chat or tap + to add</p>
          </div>
        ) : (
          notes.map(n => (
            <NoteCard key={n.id} note={n} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
