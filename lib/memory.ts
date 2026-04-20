// In-memory storage for chat threads (mock implementation)
// In production, this would be replaced with a database

import { ChatThread, Message } from './agent';

const storage = new Map<string, ChatThread[]>();

export function getUserThreads(userId: string): ChatThread[] {
  return storage.get(userId) || [];
}

export function saveThread(userId: string, thread: ChatThread): void {
  const threads = storage.get(userId) || [];
  const existingIndex = threads.findIndex(t => t.id === thread.id);
  
  if (existingIndex >= 0) {
    threads[existingIndex] = thread;
  } else {
    threads.push(thread);
  }
  
  storage.set(userId, threads);
}

export function deleteThread(userId: string, threadId: string): void {
  const threads = storage.get(userId) || [];
  storage.set(userId, threads.filter(t => t.id !== threadId));
}

export function getThread(userId: string, threadId: string): ChatThread | undefined {
  const threads = storage.get(userId) || [];
  return threads.find(t => t.id === threadId);
}

export function createNewThread(userId: string, title: string = 'New Conversation'): ChatThread {
  const thread: ChatThread = {
    id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  saveThread(userId, thread);
  return thread;
}

export function addMessageToThread(
  userId: string,
  threadId: string,
  message: Message
): void {
  const thread = getThread(userId, threadId);
  if (thread) {
    thread.messages.push(message);
    thread.updatedAt = new Date();
    
    // Auto-generate title from first user message
    if (thread.messages.length === 1 && message.role === 'user') {
      thread.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }
    
    saveThread(userId, thread);
  }
}
