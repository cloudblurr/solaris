// ─── Shared data store for all right-rail features ───────────────────────────
// In production these would be persisted to a database.

// ── Plan ─────────────────────────────────────────────────────────────────────
export interface PlanItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Plan {
  id: string;
  title: string;
  items: PlanItem[];
  isGlobal: boolean;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Compare ───────────────────────────────────────────────────────────────────
export interface CompareOption {
  id: string;
  label: string;
  pros: string[];
  cons: string[];
}

export interface CompareSession {
  id: string;
  title: string;
  options: CompareOption[];
  recommendation?: string;
  aiAnalysis?: string;
  threadId?: string;
  createdAt: Date;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  isGlobal: boolean;
  threadId?: string;
  linkedThreadId?: string; // thread to open when clicking a global task
  createdAt: Date;
}

// ── SkyNotes ──────────────────────────────────────────────────────────────────
export interface SkyNote {
  id: string;
  title: string;
  content: string;
  context?: string;
  isGlobal: boolean;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── NimbusClouds ──────────────────────────────────────────────────────────────
export type CloudStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface NimbusCloud {
  id: string;
  name: string;
  description: string;
  status: CloudStatus;
  schedule?: string; // cron-like description
  lastRun?: Date;
  nextRun?: Date;
  logs: string[];
  createdAt: Date;
}

// ── CourseSky ─────────────────────────────────────────────────────────────────
export type CourseCategory = 'technology' | 'business' | 'science' | 'design' | 'language';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CourseLesson {
  id: string;
  title: string;
  summary: string;
  completed: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  modules: CourseModule[];
  enrolledAt?: Date;
  activeThreadId?: string;
  currentLessonId?: string;
}

// ─── In-memory stores ─────────────────────────────────────────────────────────

const plans: Plan[] = [];
const compareSessions: CompareSession[] = [];
const tasks: Task[] = [];
const skyNotes: SkyNote[] = [];
const nimbusClouds: NimbusCloud[] = [];

// Seed courses
const courses: Course[] = [
  {
    id: 'course_ts_fundamentals',
    title: 'TypeScript Fundamentals',
    description: 'Master TypeScript from types to advanced generics with hands-on exercises.',
    category: 'technology',
    level: 'beginner',
    modules: [
      {
        id: 'mod_1', title: 'Getting Started',
        lessons: [
          { id: 'l1', title: 'What is TypeScript?', summary: 'Overview and setup', completed: false },
          { id: 'l2', title: 'Basic Types', summary: 'string, number, boolean, arrays', completed: false },
          { id: 'l3', title: 'Interfaces & Types', summary: 'Defining shapes', completed: false },
        ],
      },
      {
        id: 'mod_2', title: 'Advanced Patterns',
        lessons: [
          { id: 'l4', title: 'Generics', summary: 'Reusable type-safe code', completed: false },
          { id: 'l5', title: 'Utility Types', summary: 'Partial, Pick, Omit and more', completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_startup_101',
    title: 'Startup Fundamentals',
    description: 'From idea validation to fundraising — the complete founder playbook.',
    category: 'business',
    level: 'beginner',
    modules: [
      {
        id: 'mod_1', title: 'Ideation',
        lessons: [
          { id: 'l1', title: 'Finding Your Problem', summary: 'Market research basics', completed: false },
          { id: 'l2', title: 'Validation', summary: 'Testing before building', completed: false },
        ],
      },
      {
        id: 'mod_2', title: 'Building & Scaling',
        lessons: [
          { id: 'l3', title: 'MVP Strategy', summary: 'Ship fast, learn faster', completed: false },
          { id: 'l4', title: 'Fundraising 101', summary: 'Angels, VCs, and pitch decks', completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_react_advanced',
    title: 'Advanced React Patterns',
    description: 'Deep dive into hooks, context, performance, and modern React architecture.',
    category: 'technology',
    level: 'advanced',
    modules: [
      {
        id: 'mod_1', title: 'Hooks Deep Dive',
        lessons: [
          { id: 'l1', title: 'useCallback & useMemo', summary: 'Performance optimization', completed: false },
          { id: 'l2', title: 'Custom Hooks', summary: 'Reusable logic patterns', completed: false },
        ],
      },
    ],
  },
];

// ─── Plan helpers ─────────────────────────────────────────────────────────────
export function getPlans(threadId?: string): Plan[] {
  return plans.filter(p => p.isGlobal || p.threadId === threadId);
}
export function savePlan(plan: Plan) {
  const i = plans.findIndex(p => p.id === plan.id);
  if (i >= 0) plans[i] = plan; else plans.push(plan);
}
export function deletePlan(id: string) {
  const i = plans.findIndex(p => p.id === id);
  if (i >= 0) plans.splice(i, 1);
}
export function createPlan(title: string, isGlobal: boolean, threadId?: string): Plan {
  const plan: Plan = {
    id: `plan_${Date.now()}`,
    title, isGlobal, threadId,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  plans.push(plan);
  return plan;
}

// ─── Compare helpers ──────────────────────────────────────────────────────────
export function getCompareSessions(threadId?: string): CompareSession[] {
  return compareSessions.filter(s => !s.threadId || s.threadId === threadId);
}
export function saveCompareSession(s: CompareSession) {
  const i = compareSessions.findIndex(x => x.id === s.id);
  if (i >= 0) compareSessions[i] = s; else compareSessions.push(s);
}
export function deleteCompareSession(id: string) {
  const i = compareSessions.findIndex(s => s.id === id);
  if (i >= 0) compareSessions.splice(i, 1);
}
export function createCompareSession(title: string, threadId?: string): CompareSession {
  const s: CompareSession = {
    id: `cmp_${Date.now()}`,
    title, threadId,
    options: [],
    createdAt: new Date(),
  };
  compareSessions.push(s);
  return s;
}

// ─── Task helpers ─────────────────────────────────────────────────────────────
export function getTasks(threadId?: string): Task[] {
  return tasks.filter(t => t.isGlobal || t.threadId === threadId);
}
export function saveTask(task: Task) {
  const i = tasks.findIndex(t => t.id === task.id);
  if (i >= 0) tasks[i] = task; else tasks.push(task);
}
export function deleteTask(id: string) {
  const i = tasks.findIndex(t => t.id === id);
  if (i >= 0) tasks.splice(i, 1);
}
export function createTask(title: string, isGlobal: boolean, threadId?: string, dueDate?: string): Task {
  const task: Task = {
    id: `task_${Date.now()}`,
    title, isGlobal, threadId, dueDate,
    status: 'todo',
    priority: 'medium',
    createdAt: new Date(),
  };
  tasks.push(task);
  return task;
}

// ─── SkyNote helpers ──────────────────────────────────────────────────────────
export function getSkyNotes(threadId?: string): SkyNote[] {
  return skyNotes.filter(n => n.isGlobal || n.threadId === threadId);
}
export function saveSkyNote(note: SkyNote) {
  const i = skyNotes.findIndex(n => n.id === note.id);
  if (i >= 0) skyNotes[i] = note; else skyNotes.push(note);
}
export function deleteSkyNote(id: string) {
  const i = skyNotes.findIndex(n => n.id === id);
  if (i >= 0) skyNotes.splice(i, 1);
}
export function createSkyNote(title: string, content: string, isGlobal: boolean, threadId?: string, context?: string): SkyNote {
  const note: SkyNote = {
    id: `note_${Date.now()}`,
    title, content, isGlobal, threadId, context,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  skyNotes.push(note);
  return note;
}

// ─── NimbusCloud helpers ──────────────────────────────────────────────────────
export function getNimbusClouds(): NimbusCloud[] { return [...nimbusClouds]; }
export function saveNimbusCloud(cloud: NimbusCloud) {
  const i = nimbusClouds.findIndex(c => c.id === cloud.id);
  if (i >= 0) nimbusClouds[i] = cloud; else nimbusClouds.push(cloud);
}
export function deleteNimbusCloud(id: string) {
  const i = nimbusClouds.findIndex(c => c.id === id);
  if (i >= 0) nimbusClouds.splice(i, 1);
}
export function createNimbusCloud(name: string, description: string, schedule?: string): NimbusCloud {
  const cloud: NimbusCloud = {
    id: `cloud_${Date.now()}`,
    name, description, schedule,
    status: 'idle',
    logs: [],
    createdAt: new Date(),
  };
  nimbusClouds.push(cloud);
  return cloud;
}

// ─── CourseSky helpers ────────────────────────────────────────────────────────
export function getCourses(): Course[] { return [...courses]; }
export function getCourse(id: string): Course | undefined { return courses.find(c => c.id === id); }
export function enrollCourse(id: string, threadId: string) {
  const c = courses.find(c => c.id === id);
  if (c) { c.enrolledAt = new Date(); c.activeThreadId = threadId; }
}
export function markLessonComplete(courseId: string, lessonId: string) {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  for (const mod of course.modules) {
    const lesson = mod.lessons.find(l => l.id === lessonId);
    if (lesson) { lesson.completed = true; break; }
  }
}
export function getCourseProgress(course: Course): number {
  const all = course.modules.flatMap(m => m.lessons);
  if (!all.length) return 0;
  return Math.round((all.filter(l => l.completed).length / all.length) * 100);
}
