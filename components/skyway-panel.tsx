'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit, Check, X, ChevronRight, Zap, Bot,
  Brain, BookOpen, Sliders, Upload, Link, Star, Sparkles,
  Play, Settings, Copy, MoreVertical, AlertCircle, Loader2,
  Cloud, Users, Wand2, Shield, Globe, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SkywayAgent {
  id: string;
  name: string;
  description: string | null;
  personality: string | null;
  instructions: string | null;
  knowledge_base: string[];
  skills: string[];
  icon: string;
  color: string;
  temperature: number;
  is_active: boolean;
  source: string;
  created_at: string;
}

interface SkywayPanelProps {
  onAgentActivated?: (agent: SkywayAgent) => void;
}

const SKILL_OPTIONS = [
  { id: 'coding', label: 'Coding', icon: '💻' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'math', label: 'Math', icon: '🧮' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'teaching', label: 'Teaching', icon: '📚' },
  { id: 'planning', label: 'Planning', icon: '📋' },
];

const ICON_OPTIONS = ['🤖', '☁️', '🧠', '⚡', '🔮', '🌟', '🦾', '🎯', '🚀', '💡'];
const COLOR_OPTIONS = ['#facc15', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];

type PanelView = 'list' | 'create' | 'edit';

export default function SkywayPanel({ onAgentActivated }: SkywayPanelProps) {
  const [agents, setAgents] = useState<SkywayAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PanelView>('list');
  const [editingAgent, setEditingAgent] = useState<SkywayAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    personality: '',
    instructions: '',
    knowledge_base: [] as string[],
    skills: [] as string[],
    icon: '🤖',
    color: '#facc15',
    temperature: 0.7,
  });
  const [kbInput, setKbInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/skyway');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch {
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', description: '', personality: '', instructions: '', knowledge_base: [], skills: [], icon: '🤖', color: '#facc15', temperature: 0.7 });
    setEditingAgent(null);
    setView('create');
    setError(null);
  };

  const openEdit = (agent: SkywayAgent) => {
    setForm({
      name: agent.name,
      description: agent.description ?? '',
      personality: agent.personality ?? '',
      instructions: agent.instructions ?? '',
      knowledge_base: agent.knowledge_base,
      skills: agent.skills,
      icon: agent.icon,
      color: agent.color,
      temperature: agent.temperature,
    });
    setEditingAgent(agent);
    setView('edit');
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Agent name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (view === 'create') {
        const res = await fetch('/api/skyway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
      } else if (editingAgent) {
        const res = await fetch('/api/skyway', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: editingAgent.id, ...form }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      }
      await fetchAgents();
      setView('list');
    } catch {
      setError('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      await fetch(`/api/skyway?id=${agentId}`, { method: 'DELETE' });
      await fetchAgents();
    } catch {
      setError('Failed to delete agent');
    }
  };

  const handleActivate = async (agentId: string) => {
    try {
      await fetch('/api/skyway', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'activate' }),
      });
      await fetchAgents();
      const agent = agents.find((a) => a.id === agentId);
      if (agent) onAgentActivated?.(agent);
    } catch {
      setError('Failed to activate agent');
    }
  };

  const handleAIGenerate = async () => {
    if (!form.name.trim()) { setError('Enter a name first'); return; }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/agent/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a detailed agent configuration for an AI agent named "${form.name}". 
Description hint: ${form.description || 'general purpose assistant'}.
Return ONLY valid JSON with these fields:
{
  "personality": "2-3 sentences describing personality traits",
  "instructions": "Detailed system instructions for this agent (3-5 sentences)",
  "skills": ["skill1", "skill2"] (pick from: coding, research, writing, analysis, math, creative, teaching, planning),
  "temperature": 0.1-1.0 (appropriate for this agent type)
}`,
        }),
      });
      const data = await res.json();
      const text = data.response || data.content || '';
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setForm((f) => ({
          ...f,
          personality: parsed.personality || f.personality,
          instructions: parsed.instructions || f.instructions,
          skills: parsed.skills || f.skills,
          temperature: parsed.temperature || f.temperature,
        }));
      }
    } catch {
      setError('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const addKnowledgeSource = () => {
    const val = kbInput.trim();
    if (!val) return;
    setForm((f) => ({ ...f, knowledge_base: [...f.knowledge_base, val] }));
    setKbInput('');
  };

  const removeKnowledgeSource = (idx: number) => {
    setForm((f) => ({ ...f, knowledge_base: f.knowledge_base.filter((_, i) => i !== idx) }));
  };

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skillId)
        ? f.skills.filter((s) => s !== skillId)
        : [...f.skills, skillId],
    }));
  };

  const activeAgent = agents.find((a) => a.is_active);

  // ── List View ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Nimbus Sky-Way</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {agents.length}/5 agents · {activeAgent ? <span className="text-yellow-400">{activeAgent.name} active</span> : 'None active'}
            </p>
          </div>
          {agents.length < 5 && (
            <button
              onClick={openCreate}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-10">
              <Bot className="h-10 w-10 text-gray-700 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-xs text-gray-500 mb-1">No agents yet</p>
              <p className="text-[11px] text-gray-600">Create up to 5 custom agents</p>
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg transition-all border border-yellow-500/20"
              >
                Create First Agent
              </button>
            </div>
          ) : (
            <>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onActivate={() => handleActivate(agent.id)}
                  onEdit={() => openEdit(agent)}
                  onDelete={() => handleDelete(agent.id)}
                />
              ))}
              {agents.length < 5 && (
                <button
                  onClick={openCreate}
                  className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-white/20 text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Agent ({agents.length}/5)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Create / Edit Form ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6 shrink-0">
        <button
          onClick={() => setView('list')}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">
            {view === 'create' ? 'Create Agent' : `Edit: ${editingAgent?.name}`}
          </h3>
          <p className="text-[11px] text-gray-500">Configure your custom Nimbus Agent</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Identity */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" /> Identity
          </h4>

          {/* Icon + Color row */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2"
                style={{ borderColor: form.color + '60', backgroundColor: form.color + '20' }}
              >
                {form.icon}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                    className={cn(
                      'w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all',
                      form.icon === ic ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      'w-5 h-5 rounded-full transition-all',
                      form.color === c ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-black' : ''
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <input
            type="text"
            placeholder="Agent name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
          />
          <textarea
            placeholder="Short description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 resize-none"
          />
        </section>

        {/* AI Generate button */}
        <button
          onClick={handleAIGenerate}
          disabled={aiGenerating || !form.name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50"
        >
          {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {aiGenerating ? 'Generating…' : 'Auto-fill with AI'}
        </button>

        {/* Personality */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" /> Personality
          </h4>
          <textarea
            placeholder="Describe the agent's personality, tone, and communication style…"
            value={form.personality}
            onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 resize-none"
          />
        </section>

        {/* Instructions */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> System Instructions
          </h4>
          <textarea
            placeholder="Detailed instructions for how this agent should behave, what it knows, and how it responds…"
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            rows={5}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 resize-none"
          />
        </section>

        {/* Skills */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" /> Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  form.skills.includes(skill.id)
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                )}
              >
                <span>{skill.icon}</span>
                {skill.label}
              </button>
            ))}
          </div>
        </section>

        {/* Knowledge Base */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste URL or describe a knowledge source…"
              value={kbInput}
              onChange={(e) => setKbInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKnowledgeSource()}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
            />
            <button
              onClick={addKnowledgeSource}
              className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {form.knowledge_base.length > 0 && (
            <div className="space-y-1.5">
              {form.knowledge_base.map((kb, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                  <Globe className="h-3 w-3 text-gray-500 shrink-0" />
                  <span className="flex-1 text-xs text-gray-300 truncate">{kb}</span>
                  <button onClick={() => removeKnowledgeSource(idx)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Temperature */}
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5" /> Temperature
            <span className="text-yellow-400 font-bold">{form.temperature.toFixed(1)}</span>
          </h4>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={form.temperature}
            onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-yellow-400"
          />
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Precise (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative (1.0)</span>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  onActivate,
  onEdit,
  onDelete,
}: {
  agent: SkywayAgent;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'relative rounded-xl border transition-all overflow-hidden',
        agent.is_active
          ? 'border-yellow-500/40 bg-yellow-500/5'
          : 'border-white/8 bg-[#111] hover:border-white/15'
      )}
    >
      {agent.is_active && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600" />
      )}
      <div className="px-3 py-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
            style={{ borderColor: agent.color + '40', backgroundColor: agent.color + '15' }}
          >
            {agent.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">{agent.name}</span>
              {agent.is_active && (
                <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                  ACTIVE
                </span>
              )}
              {agent.source === 'marketplace' && (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                  Marketplace
                </span>
              )}
            </div>
            {agent.description && (
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{agent.description}</p>
            )}
            {agent.skills.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {agent.skills.slice(0, 3).map((s) => {
                  const skill = SKILL_OPTIONS.find((sk) => sk.id === s);
                  return (
                    <span key={s} className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                      {skill?.icon} {skill?.label || s}
                    </span>
                  );
                })}
                {agent.skills.length > 3 && (
                  <span className="text-[10px] text-gray-600">+{agent.skills.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-6 z-20 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden"
                  >
                    {!agent.is_active && (
                      <button
                        onClick={() => { onActivate(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-400 hover:bg-white/5 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" /> Set Active
                      </button>
                    )}
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Activate button if not active */}
        {!agent.is_active && (
          <button
            onClick={onActivate}
            className="mt-2.5 w-full py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Play className="h-3 w-3" /> Use this Agent
          </button>
        )}
      </div>
    </div>
  );
}
