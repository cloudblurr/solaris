/**
 * lib/user-data.ts
 * User-specific data operations with Cloudreve persistence.
 * All data is scoped to the authenticated user.
 */

import { prisma } from './prisma';
import { saveConversation } from './cloudreve-stub';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatThread {
  id: string;
  title: string;
  summary?: string | null;
  created_at: Date;
  updated_at: Date;
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string | null;
  attachments?: string | null;
  created_at: Date;
}

export interface UserMemory {
  ideas: string[];
  questions: string[];
  topics: string[];
  preferences: Record<string, unknown>;
  context_summary?: string | null;
}

export interface UserSettings {
  theme: string;
  language: string;
  notifications: boolean;
  speech_enabled: boolean;
  auto_save: boolean;
}

// ── Chat Threads ──────────────────────────────────────────────────────────────
export async function getUserThreads(userId: string): Promise<ChatThread[]> {
  const threads = await prisma.chatThread.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' },
    include: {
      messages: {
        orderBy: { created_at: 'asc' },
      },
    },
  });
  return threads.map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary,
    created_at: t.created_at,
    updated_at: t.updated_at,
    messages: t.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      mode: m.mode,
      attachments: m.attachments,
      created_at: m.created_at,
    })),
  }));
}

export async function getThread(userId: string, threadId: string): Promise<ChatThread | null> {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, user_id: userId },
    include: {
      messages: {
        orderBy: { created_at: 'asc' },
      },
    },
  });
  if (!thread) return null;
  return {
    id: thread.id,
    title: thread.title,
    summary: thread.summary,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      mode: m.mode,
      attachments: m.attachments,
      created_at: m.created_at,
    })),
  };
}

export async function createThread(userId: string, title: string = 'New Conversation'): Promise<ChatThread> {
  const thread = await prisma.chatThread.create({
    data: {
      user_id: userId,
      title,
    },
    include: {
      messages: true,
    },
  });
  return {
    id: thread.id,
    title: thread.title,
    summary: thread.summary,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
    messages: [],
  };
}

export async function updateThreadTitle(userId: string, threadId: string, title: string): Promise<void> {
  await prisma.chatThread.updateMany({
    where: { id: threadId, user_id: userId },
    data: { title },
  });
}

export async function deleteThread(userId: string, threadId: string): Promise<void> {
  // Only delete if owned by user
  await prisma.chatThread.deleteMany({
    where: { id: threadId, user_id: userId },
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────
export async function addMessage(
  userId: string,
  threadId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
    mode?: string;
    attachments?: string;
  }
): Promise<Message> {
  // Verify thread ownership
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, user_id: userId },
  });

  if (!thread) {
    throw new Error('Thread not found or access denied');
  }

  const newMessage = await prisma.message.create({
    data: {
      thread_id: threadId,
      role: message.role,
      content: message.content,
      mode: message.mode,
      attachments: message.attachments,
    },
  });

  // Auto-generate title from first user message
  if (thread.title === 'New Conversation' && message.role === 'user') {
    const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    await updateThreadTitle(userId, threadId, title);
  }

  return {
    id: newMessage.id,
    role: newMessage.role as 'user' | 'assistant',
    content: newMessage.content,
    mode: newMessage.mode,
    attachments: newMessage.attachments,
    created_at: newMessage.created_at,
  };
}

export async function getThreadMessages(userId: string, threadId: string): Promise<Message[]> {
  const thread = await getThread(userId, threadId);
  return thread?.messages || [];
}

// ── User Memory (Context) ─────────────────────────────────────────────────────
export async function getUserMemory(userId: string): Promise<UserMemory> {
  let memory = await prisma.userMemory.findUnique({
    where: { user_id: userId },
  });

  if (!memory) {
    memory = await prisma.userMemory.create({
      data: { user_id: userId },
    });
  }

  return {
    ideas: memory.ideas ? JSON.parse(memory.ideas) : [],
    questions: memory.questions ? JSON.parse(memory.questions) : [],
    topics: memory.topics ? JSON.parse(memory.topics) : [],
    preferences: memory.preferences ? JSON.parse(memory.preferences) : {},
    context_summary: memory.context_summary,
  };
}

export async function updateUserMemory(
  userId: string,
  updates: Partial<Omit<UserMemory, 'context_summary'>>
): Promise<void> {
  const data: Record<string, string | undefined> = {};

  if (updates.ideas !== undefined) data.ideas = JSON.stringify(updates.ideas);
  if (updates.questions !== undefined) data.questions = JSON.stringify(updates.questions);
  if (updates.topics !== undefined) data.topics = JSON.stringify(updates.topics);
  if (updates.preferences !== undefined) data.preferences = JSON.stringify(updates.preferences);

  await prisma.userMemory.upsert({
    where: { user_id: userId },
    update: data,
    create: {
      user_id: userId,
      ...data,
    },
  });
}

export async function updateContextSummary(userId: string, summary: string): Promise<void> {
  await prisma.userMemory.upsert({
    where: { user_id: userId },
    update: { context_summary: summary },
    create: {
      user_id: userId,
      context_summary: summary,
    },
  });
}

// ── User Settings ─────────────────────────────────────────────────────────────
export async function getUserSettings(userId: string): Promise<UserSettings> {
  let settings = await prisma.userSettings.findUnique({
    where: { user_id: userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { user_id: userId },
    });
  }

  return {
    theme: settings.theme,
    language: settings.language,
    notifications: settings.notifications,
    speech_enabled: settings.speech_enabled,
    auto_save: settings.auto_save,
  };
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const settings = await prisma.userSettings.upsert({
    where: { user_id: userId },
    update: updates,
    create: {
      user_id: userId,
      ...updates,
    },
  });

  return {
    theme: settings.theme,
    language: settings.language,
    notifications: settings.notifications,
    speech_enabled: settings.speech_enabled,
    auto_save: settings.auto_save,
  };
}

// ── Save conversation to Cloudreve ─────────────────────────────────────────────
export async function saveThreadToCloudreve(
  userId: string,
  threadId: string
): Promise<boolean> {
  try {
    const thread = await getThread(userId, threadId);
    if (!thread) return false;

    const messages = thread.messages.map(m => ({
      role: m.role,
      content: m.content,
      mode: m.mode,
      created_at: m.created_at,
    }));

    return await saveConversation(userId, threadId, messages);
  } catch (error) {
    console.error('[User Data] Failed to save thread to Cloudreve:', error);
    return false;
  }
}
