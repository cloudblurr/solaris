'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckSquare, Square, Globe, Calendar, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Task, TaskStatus, TaskPriority,
  getTasks, saveTask, deleteTask, createTask,
} from '@/lib/features';

interface TasksPanelProps {
  threadId?: string;
  onStartChat?: (title: string) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'border-white/20',
  'in-progress': 'border-blue-400',
  done: 'border-green-400 bg-green-400',
};

function TaskRow({ task, onUpdate, onDelete, onStartChat }: {
  task: Task;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
  onStartChat?: (title: string) => void;
}) {
  const cycle: TaskStatus[] = ['todo', 'in-progress', 'done'];
  const nextStatus = () => {
    const i = cycle.indexOf(task.status);
    onUpdate({ ...task, status: cycle[(i + 1) % cycle.length] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all',
        task.status === 'done' ? 'border-white/5 bg-white/2 opacity-60' : 'border-white/8 bg-[#111] hover:border-white/12'
      )}
    >
      <button
        onClick={nextStatus}
        className={cn('mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all', statusColors[task.status])}
      >
        {task.status === 'done' && <span className="text-black text-[9px] font-bold">✓</span>}
        {task.status === 'in-progress' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs leading-relaxed', task.status === 'done' ? 'line-through text-gray-600' : 'text-gray-200')}>
            {task.title}
          </span>
          {task.isGlobal && <Globe className="h-2.5 w-2.5 text-yellow-400/70 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <Calendar className="h-2.5 w-2.5" />
              {task.dueDate}
            </span>
          )}
          <span className={cn('text-[10px] font-medium', priorityColors[task.priority])}>
            {task.priority}
          </span>
          <span className="text-[10px] text-gray-600 capitalize">{task.status.replace('-', ' ')}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {task.isGlobal && task.status === 'todo' && onStartChat && (
          <button
            onClick={() => onStartChat(task.title)}
            className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 hover:border-blue-400/60 transition-all"
          >
            Start
          </button>
        )}
        <button onClick={() => onDelete(task.id)} className="text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

export default function TasksPanel({ threadId, onStartChat }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(() => getTasks(threadId));
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGlobal, setNewGlobal] = useState(false);
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [showDone, setShowDone] = useState(false);

  const refresh = () => setTasks(getTasks(threadId));

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask(newTitle.trim(), newGlobal, newGlobal ? undefined : threadId, newDue || undefined);
    const t = getTasks(threadId);
    if (t.length) { t[t.length - 1].priority = newPriority; saveTask(t[t.length - 1]); }
    setNewTitle(''); setNewDue(''); setCreating(false); refresh();
  };

  const handleUpdate = (t: Task) => { saveTask(t); refresh(); };
  const handleDelete = (id: string) => { deleteTask(id); refresh(); };

  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Tasks</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{active.length} active · {done.length} done</p>
        </div>
        <button onClick={() => setCreating(true)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/6">
            <div className="px-4 py-3 space-y-2">
              <input
                autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Task title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40"
              />
              <div className="flex gap-2">
                <input
                  type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-400 outline-none focus:border-blue-500/40"
                />
                <select
                  value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-400 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setNewGlobal(!newGlobal)}>
                  <div className={cn('w-8 h-4 rounded-full transition-all relative', newGlobal ? 'bg-yellow-400' : 'bg-white/10')}>
                    <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', newGlobal ? 'left-[18px]' : 'left-0.5')} />
                  </div>
                  <span className="text-xs text-gray-400">Global task</span>
                </label>
                <div className="flex gap-1.5">
                  <button onClick={() => setCreating(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Cancel</button>
                  <button onClick={handleCreate} className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-blue-400 transition-all">Add</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {active.length === 0 && done.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No tasks yet</p>
            <p className="text-[11px] text-gray-600 mt-1">Add tasks to track your progress</p>
          </div>
        ) : (
          <>
            {active.map(t => <TaskRow key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} onStartChat={onStartChat} />)}
            {done.length > 0 && (
              <div>
                <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors py-1">
                  {showDone ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {done.length} completed
                </button>
                <AnimatePresence>
                  {showDone && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden space-y-2 mt-1">
                      {done.map(t => <TaskRow key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
