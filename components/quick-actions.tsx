'use client';

import { motion } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  Code, 
  Lightbulb, 
  BookOpen,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

const actions = [
  {
    icon: Sparkles,
    label: 'Brainstorm',
    prompt: 'Help me brainstorm ideas for...',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Code,
    label: 'Code Help',
    prompt: 'I need help with coding...',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FileText,
    label: 'Summarize',
    prompt: 'Can you summarize this for me...',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Lightbulb,
    label: 'Explain',
    prompt: 'Please explain this concept...',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: BookOpen,
    label: 'Learn',
    prompt: 'Teach me about...',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Zap,
    label: 'Quick Task',
    prompt: 'Help me quickly with...',
    color: 'from-red-500 to-orange-500',
  },
];

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="w-80 h-full bg-gradient-to-b from-black to-gray-900 border-l border-blue-500/20 p-6">
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-yellow-400 bg-clip-text text-transparent">
            Quick Actions
          </h2>
          <p className="text-sm text-gray-400">
            Start with a template
          </p>
        </div>

        <div className="space-y-3">
          {actions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4 group hover:border-blue-500/50"
                onClick={() => onAction(action.prompt)}
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} mr-3`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">
                    {action.prompt}
                  </p>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="pt-6 border-t border-blue-500/20">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Recent Topics
          </h3>
          <div className="space-y-2">
            {['AI Development', 'Web Design', 'Data Analysis'].map((topic) => (
              <div
                key={topic}
                className="px-3 py-2 rounded-lg bg-gray-800/50 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
