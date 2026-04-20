'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Play, Pause, Square, Cloud, Zap,
  Clock, ChevronDown, ChevronUp, Loader2, Send,
  RefreshCw, X, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NimbusCloud, CloudStatus,
  getNimbusClouds, saveNimbusCloud, deleteNimbusCloud, createNimbusCloud,
} from '@/lib/features';
import { agentQuery } from '@/lib/agent-query';

const TICK_MS = 15_000;

const statusConfig: Record<CloudStatus, { label: string; color: string; dot: string }> = {
  idle:      { label: 'Idle',      color: 'text-gray-500',   dot: 'bg-gray-600' },
  running:   { label: 'Running',   color: 'text-green-400',  dot: 'bg-green-400 animate-pulse' },
  paused:    { label: 'Paused',    color: 'text-yellow-400', dot: 'bg-yellow-400' },
  completed: { label: 'Completed', color: 'text-blue-400',   dot: 'bg-blue-400' },
  error:     { label: 'Error',     color: 'text-red-400',    dot: 'bg-red-400' },
};

// ── Cloud card ────────────────────────────────────────────────────────────────
function CloudCard({ cloud, onUpdate, onDelete }: {
  cloud: NimbusCloud;
  onUpdate: (c: NimbusCloud) => void;
  onDelete: (id: string) => void;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [ticking, setTicking] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref to the latest cloud so the interval closure always sees fresh data
  const cloudRef = useRef(cloud);
  useEffect(() => { cloudRef.current = cloud; }, [cloud]);

  const cfg = statusConfig[cloud.status];

  const runTick = useCallback(async () => {
    const current = cloudRef.current;
    if (current.status !== 'running') return;
    setTicking(true);
    try {
      const result = await agentQuery(
        `You are an autonomous background agent named "${current.name}".
Your task: ${current.description}
Each cycle: report what you did (1-3 sentences), then end with exactly one status token on its own line:
[STATUS:IN_PROGRESS]  [STATUS:COMPLETED]  or  [STATUS:ERROR]`,
        `Cycle ${current.logs.length + 1}. Recent logs:\n${current.logs.slice(-3).join('\n') || 'None yet.'}\n\nExecute and report.`
      );

      const ts = new Date().toLocaleTimeString();
      const logLine = `[${ts}] ${result.replace(/\[STATUS:[A-Z_]+\]/g, '').trim()}`;
      let nextStatus: CloudStatus = 'running';
      if (result.includes('[STATUS:COMPLETED]')) nextStatus = 'completed';
      if (result.includes('[STATUS:ERROR]'))     nextStatus = 'error';

      const updated: NimbusCloud = {
        ...current,
        status: nextStatus,
        logs: [...current.logs, logLine],
        lastRun: new Date(),
      };
      saveNimbusCloud(updated);
      onUpdate(updated);

      if (nextStatus !== 'running' && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    } catch (e: any) {
      const ts = new Date().toLocaleTimeString();
      const updated: NimbusCloud = {
        ...current,
        status: 'error',
        logs: [...current.logs, `[${ts}] Error: ${e.message}`],
      };
      saveNimbusCloud(updated);
      onUpdate(updated);
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    } finally {
      setTicking(false);
    }
  }, [onUpdate]);

  useEffect(() => {
    if (cloud.status === 'running' && !tickRef.current) {
      runTick();
      tickRef.current = setInterval(runTick, TICK_MS);
    }
    if (cloud.status !== 'running' && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [cloud.status, runTick]);

  const toggleRun = () => {
    const next: CloudStatus = cloud.status === 'running' ? 'paused' : 'running';
    const ts = new Date().toLocaleTimeString();
    onUpdate({
      ...cloud,
      status: next,
      logs: [...cloud.logs, `[${ts}] Agent ${next === 'running' ? 'started' : 'paused'} by user`],
      lastRun: next === 'running' ? new Date() : cloud.lastRun,
    });
  };

  const stop = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const ts = new Date().toLocaleTimeString();
    onUpdate({ ...cloud, status: 'idle', logs: [...cloud.logs, `[${ts}] Stopped by user`] });
  };

  const reset = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    onUpdate({ ...cloud, status: 'idle', logs: [] });
  };

  return (
    <div className={cn(
      'bg-[#111] border rounded-xl overflow-hidden transition-all',
      cloud.status === 'running'   ? 'border-green-500/20' :
      cloud.status === 'error'     ? 'border-red-500/20'   :
      cloud.status === 'completed' ? 'border-blue-500/20'  : 'border-white/8'
    )}>
      <div className="px-3 py-2.5">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <div className="relative mt-0.5 shrink-0">
            <Cloud className={cn('h-5 w-5', cloud.status === 'running' ? 'text-green-400' : 'text-blue-400')} strokeWidth={1.5} />
            <div className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#111]', cfg.dot)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-200 truncate">{cloud.name}</span>
              <span className={cn('text-[10px] font-medium shrink-0', cfg.color)}>{cfg.label}</span>
              {ticking && <Loader2 className="h-2.5 w-2.5 animate-spin text-green-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{cloud.description}</p>
            {cloud.schedule && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-2.5 w-2.5 text-gray-600" />
                <span className="text-[10px] text-gray-600">{cloud.schedule}</span>
              </div>
            )}
            {cloud.lastRun && (
              <p className="text-[10px] text-gray-700 mt-0.5">
                Last run: {new Date(cloud.lastRun).toLocaleTimeString()}
              </p>
            )}
          </div>
          <button onClick={() => onDelete(cloud.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {cloud.status !== 'completed' && (
            <button
              onClick={toggleRun}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all',
                cloud.status === 'running'
                  ? 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10'
                  : 'border-green-400/30 text-green-400 hover:bg-green-400/10'
              )}
            >
              {cloud.status === 'running' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {cloud.status === 'running' ? 'Pause' : 'Run'}
            </button>
          )}
          {cloud.status !== 'idle' && (
            <button onClick={stop} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
              <Square className="h-3 w-3" /> Stop
            </button>
          )}
          {(cloud.status === 'completed' || cloud.status === 'error') && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
          )}
          {cloud.logs.length > 0 && (
            <button onClick={() => setShowLogs(!showLogs)} className="ml-auto flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              Logs ({cloud.logs.length})
              {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* Log stream */}
        <AnimatePresence>
          {showLogs && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="mt-2 bg-black/50 rounded-lg p-2.5 max-h-36 overflow-y-auto font-mono space-y-0.5">
                {cloud.logs.map((log, i) => (
                  <p key={i} className={cn(
                    'text-[10px] leading-relaxed',
                    log.toLowerCase().includes('error') ? 'text-red-400' :
                    log.toLowerCase().includes('complet') ? 'text-green-400' :
                    'text-gray-500'
                  )}>
                    {log}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Natural-language creation form ────────────────────────────────────────────
function CreateCloudForm({ onCreated, onCancel }: {
  onCreated: (c: NimbusCloud) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; description: string; schedule?: string } | null>(null);

  const parse = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const result = await agentQuery(
        `You are a task parser for an autonomous agent system. Parse the user's natural language into a structured agent definition.
Return ONLY valid JSON (no markdown, no explanation):
{"name":"Short Agent Name","description":"Detailed description of what the agent should do autonomously","schedule":"Human-readable schedule or null"}`,
        input
      );
      const match = result.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setPreview(parsed);
      } else {
        setPreview({ name: input.slice(0, 40), description: input });
      }
    } catch {
      setPreview({ name: input.slice(0, 40), description: input });
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!preview) return;
    const cloud = createNimbusCloud(preview.name, preview.description, preview.schedule || undefined);
    onCreated(cloud);
  };

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden bg-[#0f0f0f]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6">
        <Zap className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-xs font-semibold text-gray-300">New Cloud Agent</span>
        <button onClick={onCancel} className="ml-auto text-gray-600 hover:text-gray-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        <textarea
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={3}
          placeholder='Describe what this agent should do, e.g. "Monitor competitor pricing and summarize changes every hour"'
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/40 resize-none"
        />

        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2.5 space-y-1.5"
          >
            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Parsed Agent</p>
            <p className="text-xs font-medium text-white">{preview.name}</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{preview.description}</p>
            {preview.schedule && (
              <div className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 text-gray-600" />
                <span className="text-[10px] text-gray-500">{preview.schedule}</span>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex gap-1.5">
          {!preview ? (
            <button
              onClick={parse}
              disabled={!input.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
                input.trim() && !loading
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              )}
            >
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing...</>
                : <><Sparkles className="h-3.5 w-3.5" /> Parse with AI</>
              }
            </button>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2 rounded-lg text-xs border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                Edit
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-2 rounded-lg text-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-900/30"
              >
                Deploy Agent
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function NimbusCloudPanel() {
  const [clouds, setClouds] = useState<NimbusCloud[]>(() => getNimbusClouds());
  const [creating, setCreating] = useState(false);

  const refreshClouds = () => setClouds(getNimbusClouds());
  const handleUpdate = (c: NimbusCloud) => { saveNimbusCloud(c); refreshClouds(); };
  const handleDelete = (id: string) => { deleteNimbusCloud(id); refreshClouds(); };
  const handleCreated = (c: NimbusCloud) => { refreshClouds(); setCreating(false); };

  const running = clouds.filter(c => c.status === 'running').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">NimbusClouds</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {running > 0
              ? <span className="text-green-400">{running} running</span>
              : 'Autonomous AI agents'
            }
            {' · Temporal'}
          </p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
            creating
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400'
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CreateCloudForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Temporal notice */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">Powered by Temporal</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Agents run autonomously, AI-verified each cycle until completion or deprovisioned. Device integration coming soon.
          </p>
        </div>

        {clouds.length === 0 && !creating ? (
          <div className="text-center py-8">
            <Cloud className="h-8 w-8 text-gray-700 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-xs text-gray-500">No agents deployed</p>
            <p className="text-[11px] text-gray-600 mt-1">Describe a task in natural language to deploy an agent</p>
          </div>
        ) : (
          clouds.map(c => (
            <CloudCard key={c.id} cloud={c} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
