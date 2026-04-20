'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Scale,
  CheckSquare,
  StickyNote,
  Cloud,
  GraduationCap,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PlanPanel from '@/components/panels/plan-panel';
import ComparePanel from '@/components/panels/compare-panel';
import TasksPanel from '@/components/panels/tasks-panel';
import SkyNotesPanel from '@/components/panels/skynotes-panel';
import NimbusCloudPanel from '@/components/panels/nimbus-clouds-panel';
import CourseSkyPanel from '@/components/panels/coursesky-panel';
import { Course } from '@/lib/features';

type FeatureId = 'plan' | 'compare' | 'tasks' | 'skynotes' | 'clouds' | 'coursesky';

interface RightRailProps {
  threadId?: string;
  chatContext?: string;
  onNewThread?: (title?: string) => void;
  onStartCourse?: (course: Course) => void;
  onNotesRefresh?: () => void;
}

const features: { id: FeatureId; icon: React.ElementType; label: string; color: string; accent: string }[] = [
  { id: 'plan',      icon: Map,           label: 'Plan',          color: 'text-yellow-400', accent: 'bg-yellow-400/10 border-yellow-400/30' },
  { id: 'compare',   icon: Scale,         label: 'Compare',       color: 'text-blue-400',   accent: 'bg-blue-400/10 border-blue-400/30' },
  { id: 'tasks',     icon: CheckSquare,   label: 'Tasks',         color: 'text-green-400',  accent: 'bg-green-400/10 border-green-400/30' },
  { id: 'skynotes',  icon: StickyNote,    label: 'SkyNotes',      color: 'text-purple-400', accent: 'bg-purple-400/10 border-purple-400/30' },
  { id: 'clouds',    icon: Cloud,         label: 'NimbusClouds',  color: 'text-cyan-400',   accent: 'bg-cyan-400/10 border-cyan-400/30' },
  { id: 'coursesky', icon: GraduationCap, label: 'CourseSky',     color: 'text-orange-400', accent: 'bg-orange-400/10 border-orange-400/30' },
];

export default function RightRail({ threadId, chatContext, onNewThread, onStartCourse, onNotesRefresh }: RightRailProps) {
  const [active, setActive] = useState<FeatureId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    };
    if (active) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active]);

  const toggle = (id: FeatureId) => setActive(prev => prev === id ? null : id);

  const activeFeature = features.find(f => f.id === active);

  return (
    <div className="flex h-full shrink-0" ref={panelRef}>
      {/* ── Slide-out panel ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="h-full bg-[#0a0a0a] border-l border-white/6 overflow-hidden flex flex-col"
            style={{ minWidth: 0 }}
          >
            <div className="flex-1 overflow-hidden flex flex-col" style={{ width: 320 }}>
              {active === 'plan'      && <PlanPanel threadId={threadId} chatContext={chatContext} />}
              {active === 'compare'   && <ComparePanel threadId={threadId} />}
              {active === 'tasks'     && (
                <TasksPanel
                  threadId={threadId}
                  onStartChat={(title) => { onNewThread?.(title); setActive(null); }}
                />
              )}
              {active === 'skynotes'  && <SkyNotesPanel threadId={threadId} onRefresh={onNotesRefresh} />}
              {active === 'clouds'    && <NimbusCloudPanel />}
              {active === 'coursesky' && (
                <CourseSkyPanel
                  threadId={threadId}
                  onStartCourse={(course) => { onStartCourse?.(course); setActive(null); }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Icon rail ── */}
      <div className="w-12 h-full bg-[#0a0a0a] border-l border-white/5 flex flex-col items-center py-4 gap-1 shrink-0">
        {features.map(({ id, icon: Icon, label, color, accent }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              title={label}
              onClick={() => toggle(id)}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center rounded-xl transition-all group',
                isActive
                  ? cn('border', accent, color)
                  : 'text-gray-600 hover:text-gray-300 hover:bg-white/6'
              )}
            >
              <Icon className="h-4 w-4" />
              {/* Tooltip */}
              <div className="absolute right-full mr-2 px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
              </div>
            </button>
          );
        })}

        {/* Close button when panel open */}
        <AnimatePresence>
          {active && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setActive(null)}
              className="mt-auto w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/6 transition-all"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
