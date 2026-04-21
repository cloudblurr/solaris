'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from '@/components/splash-screen';
import Sidebar from '@/components/sidebar';
import ChatPanel from '@/components/chat-panel';
import RightRail from '@/components/right-rail';
import ProfileModal from '@/components/profile-modal';
import { sendMessageToAgent, Message, ChatMode, AttachedFile, ChatThread } from '@/lib/agent';
import { Course, enrollCourse } from '@/lib/features';
import ExploreMarketplace from '@/components/explore-marketplace';

// Panel types for the new sidebar features
type PanelType = 'explore' | 'skyway' | 'library' | 'spaces' | null;

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // New panel states
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [notificationCount, setNotificationCount] = useState(3); // Demo notifications
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load threads when session is ready
  useEffect(() => {
    if (session?.user?.id && !showSplash) {
      loadThreads();
    }
  }, [session?.user?.id, showSplash]);

  // DO NOT auto-create a thread — only create when user clicks "New Chat"

  const loadThreads = async () => {
    try {
      const res = await fetch('/api/threads');
      const data = await res.json();
      if (data.threads) {
        // Transform to match ChatThread interface
        const transformed: ChatThread[] = data.threads.map((t: {
          id: string;
          title: string;
          created_at: Date;
          updated_at: Date;
          messages: { id: string; role: string; content: string; mode?: string; attachments?: string; created_at: Date }[];
        }) => ({
          id: t.id,
          title: t.title,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          messages: t.messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            mode: m.mode,
            attachments: m.attachments ? JSON.parse(m.attachments) : undefined,
            timestamp: new Date(m.created_at),
          })),
        }));
        setThreads(transformed);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const handleNewThread = async (title?: string) => {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New Conversation' }),
      });
      const data = await res.json();
      if (data.thread) {
        const newThread: ChatThread = {
          id: data.thread.id,
          title: data.thread.title,
          createdAt: new Date(data.thread.created_at),
          updatedAt: new Date(data.thread.updated_at),
          messages: [],
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleStartCourse = async (course: Course) => {
    const newThread = await handleNewThreadWithTitle(`📚 ${course.title}`);
    if (newThread) {
      enrollCourse(course.id, newThread.id);
      // Seed the first message
      const intro: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: `# Welcome to **${course.title}**\n\nI'll be your instructor for this course. We'll work through ${course.modules.length} module${course.modules.length !== 1 ? 's' : ''} together.\n\n**First module: ${course.modules[0]?.title}**\n\n${course.modules[0]?.lessons[0] ? `Let's start with **${course.modules[0].lessons[0].title}** — ${course.modules[0].lessons[0].summary}.\n\nFeel free to ask questions at any point. When you're ready to move on, just say **"next"**.` : 'Let\'s get started!'}\n`,
        timestamp: new Date(),
      };
      await addMessageToThread(newThread.id, intro);
    }
  };

  const handleNewThreadWithTitle = async (title: string): Promise<ChatThread | null> => {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.thread) {
        const newThread: ChatThread = {
          id: data.thread.id,
          title: data.thread.title,
          createdAt: new Date(data.thread.created_at),
          updatedAt: new Date(data.thread.updated_at),
          messages: [],
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
        return newThread;
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
    return null;
  };

  const addMessageToThread = async (threadId: string, message: Message) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          role: message.role,
          content: message.content,
          mode: message.mode,
          attachments: message.attachments,
        }),
      });
      await loadThreads();
    } catch (error) {
      console.error('Failed to add message:', error);
    }
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await fetch(`/api/threads?id=${threadId}`, { method: 'DELETE' });
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleRegenerate = async () => {
    if (!activeThreadId) return;
    const thread = activeThread;
    if (!thread) return;

    // Find the last user message to replay
    const messages = thread.messages;
    let lastUserContent = '';
    let historyBeforeLastUser: typeof messages = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserContent = messages[i].content;
        historyBeforeLastUser = messages.slice(0, i);
        break;
      }
    }

    if (!lastUserContent) return;

    // Remove the last assistant message so we can replace it
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx !== -1) {
      const realIdx = messages.length - 1 - lastAssistantIdx;
      thread.messages.splice(realIdx, 1);
    }
    setThreads([...threads]);
    setIsLoading(true);

    try {
      const response = await sendMessageToAgent(lastUserContent, historyBeforeLastUser);
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      await addMessageToThread(activeThreadId, assistantMessage);
    } catch {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, regeneration failed. Please try again.',
        timestamp: new Date(),
      };
      await addMessageToThread(activeThreadId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for new sidebar navigation
  const handleOpenExplore = () => {
    setActivePanel(activePanel === 'explore' ? null : 'explore');
  };

  const handleOpenSkyWay = () => {
    setActivePanel(activePanel === 'skyway' ? null : 'skyway');
  };

  const handleOpenLibrary = () => {
    setActivePanel(activePanel === 'library' ? null : 'library');
  };

  const handleOpenSpaces = () => {
    setActivePanel(activePanel === 'spaces' ? null : 'spaces');
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    setActivePanel(null);
  };

  // Marketplace installation handlers
  const handleInstallAgent = async (agent: any, config: any) => {
    // Clone marketplace agent into user's Sky-Way
    try {
      const res = await fetch('/api/skyway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config?.name || agent.name,
          description: agent.description,
          personality: config?.personality || '',
          instructions: config?.instructions || '',
          icon: agent.icon,
          source: 'marketplace',
          source_item_id: agent.id,
          temperature: config?.temperature || 0.7,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to install agent:', data.error);
      }
    } catch (err) {
      console.error('Agent install error:', err);
    }
  };

  const handleInstallCloud = async (cloud: any, config: any) => {
    // Persist cloud agent to DB
    try {
      await fetch('/api/skyway/clouds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config?.name || cloud.name,
          description: cloud.description,
          schedule: config?.schedule,
          source: 'marketplace',
          source_item_id: cloud.id,
        }),
      });
    } catch (err) {
      console.error('Cloud install error:', err);
    }
  };

  const handleInstallCharacter = async (character: any, config: any) => {
    console.log('Installing character:', character.name);
    // Characters are stored as installed marketplace items — handled by the install API
  };

  const handleLaunchApp = async (app: any, config: any) => {
    const appPath = `/apps/${session?.user?.id}/${app.id}`;
    window.open(appPath, '_blank');
  };

  const handleApplySolution = async (solution: any, config: any) => {
    // Solutions behave like agents — clone into Sky-Way
    await handleInstallAgent(solution, config);
  };

  const handleUsePrompt = async (prompt: any, inCurrentChat: boolean) => {
    if (inCurrentChat && activeThreadId) {
      await handleSendMessage(prompt.description);
    } else {
      await handleNewThread(`Prompt: ${prompt.name}`);
    }
    setActivePanel(null);
  };

  const handleInstallAddon = async (addon: any, config: any) => {
    console.log('Installing addon:', addon.name);
    // Addons are tracked via installed_marketplace_items — handled by install API
  };

  const handleSendMessage = useCallback(async (content: string, mode: ChatMode = 'default', attachments: AttachedFile[] = []) => {
    if (!activeThreadId) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: new Date(),
      mode,
      attachments,
    };

    // Capture history BEFORE adding the new user message
    const historyBeforeMessage = activeThread?.messages || [];

    await addMessageToThread(activeThreadId, userMessage);
    setIsLoading(true);

    try {
      const response = await sendMessageToAgent(content, historyBeforeMessage, mode, attachments);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        mode,
      };

      await addMessageToThread(activeThreadId, assistantMessage);
    } catch {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the agent. Please try again.',
        timestamp: new Date(),
      };
      await addMessageToThread(activeThreadId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeThreadId, activeThread]);

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0e0e0f' }}>
        <div className="animate-pulse text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: '#0e0e0f' }}>
          <Sidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onNewThread={handleNewThread}
            onDeleteThread={handleDeleteThread}
            onOpenProfile={() => setShowProfile(true)}
            onOpenSettings={() => setShowProfile(true)}
            onOpenExplore={handleOpenExplore}
            onOpenSkyWay={handleOpenSkyWay}
            onOpenLibrary={handleOpenLibrary}
            onOpenSpaces={handleOpenSpaces}
            notificationCount={notificationCount}
            activePanel={activePanel}
          />

          {/* Main Content Area - switches between Chat and Marketplace */}
          {activePanel === 'explore' ? (
            <ExploreMarketplace
              onClose={() => setActivePanel(null)}
              onSelectItem={(item) => console.log('Selected:', item)}
              onInstallAgent={handleInstallAgent}
              onInstallCloud={handleInstallCloud}
              onInstallCharacter={handleInstallCharacter}
              onLaunchApp={handleLaunchApp}
              onApplySolution={handleApplySolution}
              onUsePrompt={handleUsePrompt}
              onInstallAddon={handleInstallAddon}
            />
          ) : (
            <ChatPanel
              messages={activeThread?.messages || []}
              onSendMessage={handleSendMessage}
              onRegenerate={handleRegenerate}
              isLoading={isLoading}
              threadTitle={activeThread?.title}
              threadId={activeThreadId ?? undefined}
            />
          )}

          {/* Side Panels (Right Rail + Feature Panels) */}
          <AnimatePresence>
            {activePanel === 'skyway' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-80 border-l border-white/5 bg-[#141416] overflow-hidden"
              >
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">SolarisAI Sky-Way</h2>
                  <p className="text-xs text-gray-500">Create & switch between agents</p>
                </div>
                <div className="p-4 space-y-4">
                  <button className="w-full p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:border-orange-500 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">➕</span>
                      <div>
                        <div className="text-sm font-medium text-white">Create New Agent</div>
                        <div className="text-xs text-gray-500">Build a custom Solaris Agent</div>
                      </div>
                    </div>
                  </button>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Agents (0/5)</h3>
                    <p className="text-xs text-gray-600">Create up to 5 custom agents with unique personalities, instructions, knowledge bases, and skills.</p>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Agent</h3>
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <div className="text-sm font-medium text-white">Solaris Core</div>
                          <div className="text-xs text-gray-500">Default agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activePanel === 'library' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-80 border-l border-white/5 bg-[#141416] overflow-hidden"
              >
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Library</h2>
                  <p className="text-xs text-gray-500">Your generated content & files</p>
                </div>
                <div className="p-4 space-y-3">
                  <button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🖼️</span>
                      <div>
                        <div className="text-sm font-medium text-white">NimbusFiles</div>
                        <div className="text-xs text-gray-500">Images & Videos</div>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📁</span>
                      <div>
                        <div className="text-sm font-medium text-white">Projects</div>
                        <div className="text-xs text-gray-500">All project files</div>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="text-sm font-medium text-white">Documents</div>
                        <div className="text-xs text-gray-500">Docs, notes, & more</div>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
            
            {activePanel === 'spaces' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-80 border-l border-white/5 bg-[#141416] overflow-hidden"
              >
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Solaris Spaces</h2>
                  <p className="text-xs text-gray-500">Create & manage projects</p>
                </div>
                <div className="p-4 space-y-3">
                  {/* App Space */}
                  <button className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 hover:border-blue-500 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🖥️</span>
                      <div>
                        <div className="text-sm font-medium text-white">App Space</div>
                        <div className="text-xs text-gray-500">Build apps with the agent</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Idea Space */}
                  <button className="w-full p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 hover:border-green-500 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💡</span>
                      <div>
                        <div className="text-sm font-medium text-white">Idea Space</div>
                        <div className="text-xs text-gray-500">Document & develop ideas</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Freeform Space */}
                  <button className="w-full p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:border-orange-500 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="text-sm font-medium text-white">Freeform Space</div>
                        <div className="text-xs text-gray-500">Open-ended workspace</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* More Space Types */}
                  <button className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">➕</span>
                      <div>
                        <div className="text-sm font-medium text-white">More Spaces</div>
                        <div className="text-xs text-gray-500">Data, Research, & more</div>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <RightRail
            threadId={activeThreadId ?? undefined}
            chatContext={activeThread?.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}
            onNewThread={handleNewThread}
            onStartCourse={handleStartCourse}
          />
        </div>
      )}

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
