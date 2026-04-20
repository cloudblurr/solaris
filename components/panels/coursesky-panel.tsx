'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Play, ChevronDown, ChevronUp, Check, Lock, GraduationCap, Zap, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Course, CourseModule, CourseLesson,
  getCourses, getCourse, enrollCourse, markLessonComplete, getCourseProgress,
} from '@/lib/features';

const categoryColors: Record<string, string> = {
  technology: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  business:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  science:    'text-green-400 bg-green-400/10 border-green-400/20',
  design:     'text-purple-400 bg-purple-400/10 border-purple-400/20',
  language:   'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

const levelColors: Record<string, string> = {
  beginner:     'text-green-400',
  intermediate: 'text-yellow-400',
  advanced:     'text-red-400',
};

interface CourseSkyPanelProps {
  threadId?: string;
  onStartCourse?: (course: Course) => void;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-blue-500 to-yellow-400 rounded-full"
      />
    </div>
  );
}

function CourseCard({ course, onStart }: { course: Course; onStart: (c: Course) => void }) {
  const [expanded, setExpanded] = useState(false);
  const progress = getCourseProgress(course);
  const enrolled = !!course.enrolledAt;
  const catStyle = categoryColors[course.category] || 'text-gray-400 bg-white/5 border-white/10';

  return (
    <div className={cn('bg-[#111] border rounded-xl overflow-hidden transition-all', enrolled ? 'border-blue-500/20' : 'border-white/8')}>
      <div className="px-3 py-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-semibold text-gray-100 leading-tight">{course.title}</span>
              <span className={cn('text-[10px] font-medium shrink-0', levelColors[course.level])}>{course.level}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{course.description}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize', catStyle)}>
                {course.category}
              </span>
              <span className="text-[10px] text-gray-600">
                {course.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons
              </span>
            </div>
          </div>
        </div>

        {enrolled && (
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Progress</span>
              <span className="text-[10px] text-gray-400 font-medium">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}

        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={() => onStart(course)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all',
              enrolled
                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/30'
            )}
          >
            <Play className="h-3 w-3" />
            {enrolled ? (progress === 100 ? 'Review' : 'Continue') : 'Start Course'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            Modules
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Module list */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/6">
            <div className="px-3 py-2.5 space-y-2">
              {course.modules.map((mod, mi) => {
                const modDone = mod.lessons.every(l => l.completed);
                return (
                  <div key={mod.id}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center shrink-0', modDone ? 'bg-green-400 border-green-400' : 'border-white/20')}>
                        {modDone && <Check className="h-2.5 w-2.5 text-black" />}
                      </div>
                      <span className="text-[11px] font-medium text-gray-300">{mod.title}</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {mod.lessons.map((lesson, li) => (
                        <div key={lesson.id} className="flex items-center gap-2">
                          {lesson.completed
                            ? <Check className="h-3 w-3 text-green-400 shrink-0" />
                            : <div className="w-3 h-3 rounded-full border border-white/15 shrink-0" />
                          }
                          <span className={cn('text-[11px] leading-relaxed', lesson.completed ? 'text-gray-600 line-through' : 'text-gray-400')}>
                            {lesson.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CourseSkyPanel({ threadId, onStartCourse }: CourseSkyPanelProps) {
  const [courses] = useState<Course[]>(() => getCourses());
  const [filter, setFilter] = useState<string>('all');

  const categories = ['all', 'technology', 'business', 'design', 'science', 'language'];
  const filtered = filter === 'all' ? courses : courses.filter(c => c.category === filter);
  const enrolled = courses.filter(c => c.enrolledAt);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">CourseSky</h3>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-[11px] text-gray-500">{enrolled.length} enrolled</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500">AI-led interactive courses</p>
      </div>

      {/* Category filter */}
      <div className="px-3 py-2 border-b border-white/6 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'text-[10px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all capitalize font-medium shrink-0',
                filter === cat
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Nimbus AI lecture notice */}
      <div className="mx-3 mt-3 bg-yellow-400/5 border border-yellow-400/15 rounded-xl px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-[11px] font-semibold text-yellow-400">AI-Led Lectures</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Nimbus AI guides each lesson. Ask questions anytime before advancing to the next section.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">No courses in this category</p>
          </div>
        ) : filtered.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            onStart={(c) => {
              if (threadId) enrollCourse(c.id, threadId);
              onStartCourse?.(c);
            }}
          />
        ))}
      </div>
    </div>
  );
}
