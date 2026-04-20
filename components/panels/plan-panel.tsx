'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Copy, Check, Pencil, X,
  Sparkles, Loader2, Send, Cloud, Map,
  ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/markdown-renderer';
import {
  Plan, PlanItem,
  getPlans, savePlan, deletePlan, createPlan,
} from '@/lib/features';
import { agentQuery } from '@/lib/agent-query';

interface PlanPanelProps {
  threadId?: string;
  /** Raw text of the current chat thread so user can import from it */
  chatContext?: string;
}

type PlanMsg = { role: 'user' | 'assistant'; content: string };

// ── Nimbus mini-header ────────────────────────────────────────────────────────
function NimbusTag() {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="relative w-4 h-4 rounded-md bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
        <Cloud className="h-2.5 w-2.5 text-blue-200" strokeWidth={1.5} />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 tracking-wide">Nimbus AI</span>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onUpdate, onDelete }: {
  plan: Plan;
  onUpdate: (p: Plan) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(plan.title);
  const [newItem, setNewItem] = useState('');
  const [expanded, setExpanded] = useState(true);

  const copyAll = () => {
    const text = `# ${plan.title}\n\n` + plan.items.map(i => `${i.done ? '✅' : '☐'} ${i.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    onUpdate({
      ...plan,
      items: [...plan.items, { id: `item_${Date.now()}`, text: newItem.trim(), done: false }],
      updatedAt: new Date(),
    });
    setNewItem('');
  };

  const toggleItem = (id: string) =>
    onUpdate({ ...plan, items: plan.items.map(i => i.id === id ? { ...i, done: !i.done } : i), updatedAt: new Date() });

  const removeItem = (id: string) =>
    onUpdate({ ...plan, items: plan.items.filter(i => i.id !== id), updatedAt: new Date() });

  const saveTitle = () => {
    onUpdate({ ...plan, title: titleVal.trim() || plan.title, updatedAt: new Date() });
    setEditingTitle(false);
  };

  const done = plan.items.filter(i => i.done).length;

  return (
    <div className="bg-[#111] border border-white/8 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', plan.isGlobal ? 'bg-yellow-400' : 'bg-blue-400')} />
        {editingTitle ? (
          <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
            onBlur={saveTitle} onKeyDown={e => e.key === 'Enter' && saveTitle()}
            className="flex-1 bg-transparent text-xs text-white outline-none border-b border-blue-500/50" />
        ) : (
          <span className="flex-1 text-xs font-medium text-gray-200 truncate">{plan.title}</span>
        )}
        {plan.items.length > 0 && (
          <span className="text-[10px] text-gray-600 shrink-0">{done}/{plan.items.length}</span>
        )}
        <span className="text-[10px] text-gray-600 shrink-0">{plan.isGlobal ? 'Global' : 'Chat'}</span>
        <button onClick={() => setEditingTitle(true)} className="text-gray-600 hover:text-gray-300 transition-colors"><Pencil className="h-3 w-3" /></button>
        <button onClick={copyAll} className="text-gray-600 hover:text-gray-300 transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </button>
        <button onClick={() => onDelete(plan.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="h-3 w-3" /></button>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-300 transition-colors">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 py-2 space-y-1.5 max-h-52 overflow-y-auto">
              {plan.items.length === 0 && <p className="text-xs text-gray-600 py-2 text-center">No items yet</p>}
              {plan.items.map(item => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <button onClick={() => toggleItem(item.id)}
                    className={cn('mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all',
                      item.done ? 'bg-yellow-400 border-yellow-400' : 'border-white/20 hover:border-yellow-400/50')}>
                    {item.done && <Check className="h-2.5 w-2.5 text-black" />}
                  </button>
                  <span className={cn('flex-1 text-xs leading-relaxed', item.done ? 'line-through text-gray-600' : 'text-gray-300')}>
                    {item.text}
                  </span>
                  <button onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-3 pb-2.5 flex gap-1.5">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Add item..."
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40" />
              <button onClick={addItem} disabled={!newItem.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 disabled:opacity-30 transition-all">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Chat for plan creation ─────────────────────────────────────────────────
function PlanChat({ threadId, chatContext, onPlanCreated }: {
  threadId?: string;
  chatContext?: string;
  onPlanCreated: (plan: Plan) => void;
}) {
  const [msgs, setMsgs] = useState<PlanMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const SYSTEM = `You are a planning assistant inside Nimbus AI. Help the user create structured, actionable plans.
When the user describes what they want to plan, respond with a clear plan in this exact JSON format wrapped in a markdown code block:
\`\`\`json
{"title":"Plan Title","items":["Step 1","Step 2","Step 3"]}
\`\`\`
Then briefly explain the plan in 1-2 sentences. If the user asks questions or wants to refine, continue the conversation naturally. Always end with the JSON block when you have a final plan ready.`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMsgs: PlanMsg[] = [...msgs, { role: 'user', content: userMsg }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const contextNote = chatContext
        ? `\n\nContext from current chat:\n${chatContext.slice(0, 1500)}`
        : '';
      const reply = await agentQuery(
        SYSTEM + contextNote,
        userMsg,
        msgs.map(m => ({ role: m.role, content: m.content }))
      );
      setMsgs([...newMsgs, { role: 'assistant', content: reply }]);

      // Auto-extract plan JSON if present
      const match = reply.match(/```json\s*([\s\S]*?)```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.title && Array.isArray(parsed.items)) {
            const plan = createPlan(parsed.title, isGlobal, isGlobal ? undefined : threadId);
            plan.items = parsed.items.map((text: string, i: number) => ({
              id: `item_${Date.now()}_${i}`, text, done: false,
            }));
            savePlan(plan);
            onPlanCreated(plan);
          }
        } catch { /* ignore parse errors */ }
      }
    } catch (e: any) {
      setMsgs([...newMsgs, { role: 'assistant', content: `**Error:** ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const importFromChat = async () => {
    if (!chatContext || loading) return;
    setLoading(true);
    const prompt = `Based on this conversation, extract or create a structured action plan:\n\n${chatContext.slice(0, 2000)}`;
    const newMsgs: PlanMsg[] = [...msgs, { role: 'user', content: 'Import plan from current chat' }];
    setMsgs(newMsgs);
    try {
      const reply = await agentQuery(SYSTEM, prompt, []);
      setMsgs([...newMsgs, { role: 'assistant', content: reply }]);
      const match = reply.match(/```json\s*([\s\S]*?)```/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        if (parsed.title && Array.isArray(parsed.items)) {
          const plan = createPlan(parsed.title, isGlobal, isGlobal ? undefined : threadId);
          plan.items = parsed.items.map((text: string, i: number) => ({
            id: `item_${Date.now()}_${i}`, text, done: false,
          }));
          savePlan(plan);
          onPlanCreated(plan);
        }
      }
    } catch (e: any) {
      setMsgs([...newMsgs, { role: 'assistant', content: `**Error:** ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border border-white/8 rounded-xl overflow-hidden bg-[#0f0f0f]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6">
        <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
        <span className="text-xs font-semibold text-gray-300">Plan with AI</span>
        <label className="ml-auto flex items-center gap-1.5 cursor-pointer" onClick={() => setIsGlobal(!isGlobal)}>
          <div className={cn('w-7 h-3.5 rounded-full transition-all relative', isGlobal ? 'bg-yellow-400' : 'bg-white/10')}>
            <div className={cn('absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all', isGlobal ? 'left-[16px]' : 'left-0.5')} />
          </div>
          <span className="text-[10px] text-gray-500">Global</span>
        </label>
        {chatContext && (
          <button onClick={importFromChat} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-400/60 px-2 py-0.5 rounded-md transition-all disabled:opacity-40">
            <Download className="h-2.5 w-2.5" />
            Import from chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-56 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {msgs.length === 0 && (
          <p className="text-[11px] text-gray-600 text-center py-4">
            Describe what you want to plan, or import from the current chat.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && <NimbusTag />}
            <div className={cn(
              'max-w-[90%] rounded-xl px-3 py-2 text-xs',
              m.role === 'user'
                ? 'bg-[#1a1a2e] border border-blue-500/20 text-gray-100'
                : 'bg-[#111] border border-white/6 text-gray-200'
            )}>
              {m.role === 'assistant'
                ? <MarkdownRenderer content={m.content} />
                : <p>{m.content}</p>
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <NimbusTag />
            <div className="bg-[#111] border border-white/6 rounded-xl px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1.5 px-3 pb-3 pt-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Describe your plan..."
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-yellow-400/40"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
            input.trim() && !loading ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-white/5 text-gray-600 cursor-not-allowed')}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function PlanPanel({ threadId, chatContext }: PlanPanelProps) {
  const [plans, setPlans] = useState<Plan[]>(() => getPlans(threadId));
  const [showChat, setShowChat] = useState(false);

  const refresh = () => setPlans(getPlans(threadId));
  const handleUpdate = (p: Plan) => { savePlan(p); refresh(); };
  const handleDelete = (id: string) => { deletePlan(id); refresh(); };
  const handlePlanCreated = (p: Plan) => { refresh(); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Plan</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">AI-powered planning</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowChat(!showChat)}
            className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all',
              showChat ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20')}>
            <Sparkles className="h-3 w-3" />
            AI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* AI Chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PlanChat threadId={threadId} chatContext={chatContext} onPlanCreated={handlePlanCreated} />
            </motion.div>
          )}
        </AnimatePresence>

        {plans.length === 0 && !showChat ? (
          <div className="text-center py-12">
            <Map className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No plans yet</p>
            <p className="text-[11px] text-gray-600 mt-1">Use AI to create a plan or add one manually</p>
            <button onClick={() => setShowChat(true)}
              className="mt-3 flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 mx-auto transition-colors">
              <Sparkles className="h-3 w-3" /> Create with AI
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
