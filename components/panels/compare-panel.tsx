'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, X, Scale, Lightbulb, Sparkles,
  Loader2, Copy, Check, ChevronDown, ChevronUp, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/markdown-renderer';
import {
  CompareSession,
  getCompareSessions, saveCompareSession, deleteCompareSession, createCompareSession,
} from '@/lib/features';
import { agentQuery } from '@/lib/agent-query';

interface ComparePanelProps { threadId?: string; }

// ── Single comparison session ─────────────────────────────────────────────────
function SessionCard({
  session, onUpdate, onDelete,
}: {
  session: CompareSession;
  onUpdate: (s: CompareSession) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [newOption, setNewOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addOption = () => {
    if (!newOption.trim()) return;
    onUpdate({
      ...session,
      options: [
        ...session.options,
        { id: `opt_${Date.now()}`, label: newOption.trim(), pros: [], cons: [] },
      ],
    });
    setNewOption('');
  };

  const removeOption = (id: string) => {
    onUpdate({ ...session, options: session.options.filter(o => o.id !== id) });
  };

  const runComparison = async () => {
    if (session.options.length < 2) return;
    setLoading(true);
    try {
      const optionList = session.options.map(o => o.label).join(', ');
      const result = await agentQuery(
        `You are an expert analyst. When asked to compare options, produce a thorough, well-structured markdown response that includes:
1. A summary table with key attributes side-by-side
2. Pros and cons for each option as bullet lists
3. A "Best For" section explaining ideal use cases per option
4. A clear Recommendation section with your pick and reasoning
Always use markdown tables, headers, and bullet points. Be concise but comprehensive.`,
        `Compare these options for "${session.title}": ${optionList}. Provide a full side-by-side analysis.`
      );
      onUpdate({ ...session, aiAnalysis: result });
    } catch (e: any) {
      onUpdate({ ...session, aiAnalysis: `**Error:** ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const copyAnalysis = () => {
    if (!session.aiAnalysis) return;
    navigator.clipboard.writeText(session.aiAnalysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/8 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Scale className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        <span className="flex-1 text-xs font-medium text-gray-200 truncate">{session.title}</span>
        <span className="text-[10px] text-gray-600 shrink-0">{session.options.length} options</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(session.id); }}
          className="text-gray-600 hover:text-red-400 transition-colors mr-1"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-600" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-600" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              {/* Option chips */}
              <div className="flex flex-wrap gap-1.5">
                {session.options.map(opt => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1"
                  >
                    <span className="text-xs text-blue-300">{opt.label}</span>
                    <button onClick={() => removeOption(opt.id)} className="text-blue-400/50 hover:text-red-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add option */}
              <div className="flex gap-1.5">
                <input
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOption()}
                  placeholder="Add option (e.g. React, Vue, Angular)..."
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40"
                />
                <button
                  onClick={addOption}
                  disabled={!newOption.trim()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 disabled:opacity-30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Run AI comparison */}
              <button
                onClick={runComparison}
                disabled={session.options.length < 2 || loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all',
                  session.options.length >= 2 && !loading
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/30'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing with AI...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Compare with Nimbus AI</>
                )}
              </button>

              {/* AI Analysis result */}
              {session.aiAnalysis && (
                <div className="bg-[#111] border border-blue-500/15 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6">
                    <div className="relative flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-blue-900">
                      <Cloud className="h-3 w-3 text-blue-200" strokeWidth={1.5} />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-300">Nimbus AI Analysis</span>
                    <button onClick={copyAnalysis} className="ml-auto text-gray-600 hover:text-gray-300 transition-colors">
                      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="px-3 py-3 max-h-96 overflow-y-auto">
                    <MarkdownRenderer content={session.aiAnalysis} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function ComparePanel({ threadId }: ComparePanelProps) {
  const [sessions, setSessions] = useState<CompareSession[]>(() => getCompareSessions(threadId));
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const refresh = () => setSessions(getCompareSessions(threadId));

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createCompareSession(newTitle.trim(), threadId);
    setNewTitle(''); setCreating(false); refresh();
  };

  const handleUpdate = (s: CompareSession) => { saveCompareSession(s); refresh(); };
  const handleDelete = (id: string) => { deleteCompareSession(id); refresh(); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Compare</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">AI-powered side-by-side analysis</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/6"
          >
            <div className="px-4 py-3 flex gap-2">
              <input
                autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder='e.g. "Frontend Frameworks" or "Cloud Providers"'
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40"
              />
              <button onClick={() => setCreating(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2">✕</button>
              <button onClick={handleCreate} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-400 transition-all">Create</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No comparisons yet</p>
            <p className="text-[11px] text-gray-600 mt-1">Create one, add options, then let Nimbus AI compare them</p>
          </div>
        ) : sessions.map(s => (
          <SessionCard key={s.id} session={s} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
