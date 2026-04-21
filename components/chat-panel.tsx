'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Copy, Check, RotateCcw, Sparkles, Globe, Code2, Lightbulb,
  MoreHorizontal, Paperclip, Mic, MicOff, Send, Pencil, Share, Star,
  Ellipsis, Zap, Wand2, X, FileText, Image, FileCode, File,
  ChevronDown, Languages, AlignLeft, HelpCircle, Bug,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, ChatMode, CHAT_MODES, AttachedFile, enhancePrompt } from '@/lib/agent';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/markdown-renderer';
import SelectionToolbar from '@/components/selection-toolbar';
import { isSpeechSupported, createSpeechRecognizer, SpeechStatus } from '@/lib/speech';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, mode: ChatMode, attachments: AttachedFile[]) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isLoading: boolean;
  threadTitle?: string;
  threadId?: string;
  onNotesSaved?: () => void;
}

const PRIMARY_MODES: { mode: ChatMode; icon: React.ElementType; label: string }[] = [
  { mode: 'brainstorm', icon: Sparkles,  label: 'Brainstorm' },
  { mode: 'websearch',  icon: Globe,     label: 'Web Search' },
  { mode: 'code',       icon: Code2,     label: 'Code'       },
  { mode: 'advice',     icon: Lightbulb, label: 'Get Advice' },
];

const MORE_MODES: { mode: ChatMode; icon: React.ElementType; label: string }[] = [
  { mode: 'translate', icon: Languages,  label: 'Translate'  },
  { mode: 'summarize', icon: AlignLeft,  label: 'Summarize'  },
  { mode: 'explain',   icon: HelpCircle, label: 'Explain'    },
  { mode: 'debug',     icon: Bug,        label: 'Debug'      },
];

const ACCEPTED_TYPES = 'image/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.cs,.go,.rs,.json,.yaml,.yml,.toml,.xml,.html,.css,.md,.txt';

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image className="h-3 w-3" />;
  if (/\.(js|ts|tsx|jsx|py|java|cpp|go|rs|json|yaml|html|css)/.test(type)) return <FileCode className="h-3 w-3" />;
  if (type.includes('text') || type.includes('pdf') || type.includes('doc')) return <FileText className="h-3 w-3" />;
  return <File className="h-3 w-3" />;
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="w-2 h-2 rounded-full bg-blue-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  );
}

// ── Solaris header ────────────────────────────────────────────────────────────
function NimbusHeader({ mode }: { mode?: ChatMode }) {
  const modeConfig = mode && mode !== 'default' ? CHAT_MODES[mode] : null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-[#f05a28] to-[#e03020] shadow-md shadow-orange-700/40 border border-black/30">
        <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center border border-black/20">
          <Sparkles className="h-1.5 w-1.5 text-[#f05a28]" />
        </span>
      </div>
      <span className="text-xs font-semibold text-gray-300 tracking-wide">SolarisAI</span>
      {modeConfig && (
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/5 border border-white/8', modeConfig.color)}>
          {modeConfig.label}
        </span>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, isLast, onRegenerate, isLoading }: {
  message: Message; isLast: boolean; onRegenerate?: () => void; isLoading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-3">
        <div className="flex flex-col items-end gap-1.5 max-w-[72%]">
          <div className="bg-gradient-to-br from-[#f05a28] to-[#e03020] border border-black/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed shadow-lg shadow-orange-700/20">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {message.attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-black/20 border border-white/20 rounded-lg px-2 py-1">
                    <FileIcon type={f.type} />
                    <span className="text-[10px] text-white/80 max-w-[100px] truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors px-1 py-0.5">
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <Avatar className="h-8 w-8 shrink-0 mt-1 border-2 border-black/20">
          <AvatarFallback className="bg-gradient-to-br from-[#f05a28] to-[#e03020] text-white text-xs font-bold">U</AvatarFallback>
        </Avatar>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="flex flex-col gap-0 flex-1 min-w-0">
        <NimbusHeader mode={message.mode} />
        <div className="bg-[#111111] border border-white/8 rounded-2xl rounded-tl-sm px-5 py-4">
          <MarkdownRenderer content={message.content} />
        </div>
        <div className="flex items-center gap-1 mt-2 ml-1">
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded-md hover:bg-white/5">
            {copied ? <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="h-3 w-3" />Copy</>}
          </button>
          {isLast && onRegenerate && (
            <button onClick={onRegenerate} disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded-md hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
              <RotateCcw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── More modes dropdown ───────────────────────────────────────────────────────
function MoreModesMenu({ activeMode, onSelect, onClose }: {
  activeMode: ChatMode; onSelect: (m: ChatMode) => void; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.12 }}
      className="absolute bottom-full mb-2 left-0 bg-[#1a1a1a] border border-white/12 rounded-xl shadow-2xl shadow-black/60 p-1.5 z-50 min-w-[140px]">
      {MORE_MODES.map(({ mode, icon: Icon, label }) => (
        <button key={mode} onClick={() => { onSelect(mode); onClose(); }}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
            activeMode === mode ? cn('font-semibold', CHAT_MODES[mode].color, 'bg-white/8') : 'text-gray-400 hover:text-white hover:bg-white/6')}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </button>
      ))}
      <div className="border-t border-white/8 mt-1 pt-1">
        <button onClick={() => { onSelect('default'); onClose(); }}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
            activeMode === 'default' ? 'text-gray-300 bg-white/8 font-semibold' : 'text-gray-500 hover:text-gray-300 hover:bg-white/6')}>
          <Zap className="h-3.5 w-3.5 shrink-0" />
          Default
        </button>
      </div>
    </motion.div>
  );
}

// ── Attached file pill ────────────────────────────────────────────────────────
function FilePill({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-lg px-2 py-1 group">
      <FileIcon type={file.type} />
      <span className="text-[11px] text-gray-300 max-w-[80px] truncate">{file.name}</span>
      <span className="text-[10px] text-gray-600">{(file.size / 1024).toFixed(0)}KB</span>
      <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors ml-0.5">
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel({
  messages, onSendMessage, onRegenerate, isLoading, threadTitle, threadId, onNotesSaved,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<ChatMode>('default');
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const [originalInput, setOriginalInput] = useState('');
  const [enhanceVariation, setEnhanceVariation] = useState(0);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [speechError, setSpeechError] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer>>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  }, [input]);

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreModes(false);
    };
    if (showMoreModes) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreModes]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { recognizerRef.current?.stop(); };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    const atts = [...attachments];
    setInput('');
    setAttachments([]);
    setIsEnhanced(false);
    setOriginalInput('');
    setEnhanceVariation(0);
    await onSendMessage(msg, activeMode, atts);
  }, [input, isLoading, activeMode, attachments, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleModeChip = (mode: ChatMode) => {
    setActiveMode(prev => prev === mode ? 'default' : mode);
    textareaRef.current?.focus();
  };

  // ── Enhance prompt ──────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!input.trim() || enhancing) return;
    if (!isEnhanced) {
      setOriginalInput(input);
      setEnhancing(true);
      try {
        const enhanced = await enhancePrompt(input, 0);
        setInput(enhanced);
        setIsEnhanced(true);
        setEnhanceVariation(0);
      } catch { /* keep original */ }
      finally { setEnhancing(false); }
    } else {
      // Cycle: enhanced → original → variation 1 → variation 2 → ...
      const nextVariation = enhanceVariation + 1;
      if (nextVariation === 1) {
        setInput(originalInput);
        setIsEnhanced(false);
        setEnhanceVariation(0);
      } else {
        setEnhancing(true);
        try {
          const enhanced = await enhancePrompt(originalInput, nextVariation - 1);
          setInput(enhanced);
          setEnhanceVariation(nextVariation);
        } catch { }
        finally { setEnhancing(false); }
      }
    }
    textareaRef.current?.focus();
  };

  // ── File attachment ─────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const processed: AttachedFile[] = await Promise.all(files.map(async (file) => {
      const isText = file.type.startsWith('text/') || /\.(js|ts|tsx|jsx|py|java|cpp|c|cs|go|rs|json|yaml|yml|toml|xml|html|css|md|txt|csv)$/.test(file.name);
      const isImage = file.type.startsWith('image/');
      let dataUrl = '';
      let textContent: string | undefined;
      if (isImage || isText) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          if (isText) reader.readAsText(file);
          else reader.readAsDataURL(file);
        });
        if (isText) textContent = dataUrl;
      }
      return { name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl, textContent };
    }));
    setAttachments(prev => [...prev, ...processed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Speech to text ──────────────────────────────────────────────────────────
  const toggleSpeech = () => {
    if (speechStatus === 'listening') {
      recognizerRef.current?.stop();
      setSpeechStatus('idle');
      setInterimTranscript('');
      return;
    }
    setSpeechError('');
    const rec = createSpeechRecognizer({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setInput(prev => (prev ? prev + ' ' : '') + transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      },
      onStatusChange: setSpeechStatus,
      onError: (err) => { setSpeechError(err); setInterimTranscript(''); },
    });
    if (rec) { recognizerRef.current = rec; rec.start(); }
  };

  const lastAssistantIdx = messages.reduce((last, m, i) => (m.role === 'assistant' ? i : last), -1);
  const activeModeConfig = CHAT_MODES[activeMode];
  const isMoreMode = MORE_MODES.some(m => m.mode === activeMode);

  return (
    <div className={cn('flex-1 flex flex-col h-full min-w-0', isLight ? 'bg-[#f5f2ee]' : 'bg-[#0e0e0f]')}>
      <SelectionToolbar threadId={threadId} onNoteSaved={onNotesSaved} />

      {/* Top bar */}
      <div className={cn('flex items-center gap-3 px-5 py-3 border-b shrink-0', isLight ? 'border-black/10' : 'border-white/5')}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', isLight ? 'border-black/20' : 'border-white/20')}>
            <div className={cn('w-2 h-2 rounded-sm', isLight ? 'bg-black/30' : 'bg-white/40')} />
          </div>
          <span className={cn('text-sm truncate font-medium', isLight ? 'text-gray-800' : 'text-gray-200')}>{threadTitle || 'New conversation'}</span>
          <button className={cn('transition-colors shrink-0', isLight ? 'text-gray-400 hover:text-gray-700' : 'text-gray-600 hover:text-gray-400')}><Pencil className="h-3.5 w-3.5" /></button>
        </div>
        {activeMode !== 'default' && (
          <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/8', activeModeConfig.color)}>
            <span>{activeModeConfig.label} Mode</span>
            <button onClick={() => setActiveMode('default')} className="hover:text-white transition-colors"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button className={cn('flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-all', isLight ? 'text-gray-600 hover:text-gray-900 border-black/15 hover:border-black/30' : 'text-gray-400 hover:text-white border-white/10 hover:border-white/20')}>
            <Share className="h-3.5 w-3.5" />Share
          </button>
          <button className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all', isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-gray-500 hover:text-gray-200 hover:bg-white/8')}><Star className="h-4 w-4" /></button>
          <button className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all', isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-gray-500 hover:text-gray-200 hover:bg-white/8')}><Ellipsis className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center">
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }} className="mb-6 relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f05a28] to-[#e03020] flex items-center justify-center shadow-xl shadow-orange-700/40 border-2 border-black/30">
                  <Zap className="h-8 w-8 text-white" strokeWidth={1.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center border border-black/20 shadow">
                  <Sparkles className="h-3 w-3 text-[#f05a28]" />
                </div>
              </motion.div>
              <h2 className={cn('text-2xl font-bold mb-2', isLight ? 'text-gray-900' : 'text-white')}>Ask me anything</h2>
              <p className={cn('text-sm max-w-xs', isLight ? 'text-gray-500' : 'text-gray-500')}>SolarisAI is ready to help. Start a conversation below.</p>
              <p className={cn('text-xs mt-1 font-medium tracking-widest uppercase', isLight ? 'text-orange-500/60' : 'text-orange-500/50')}>by terraGravity</p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {PRIMARY_MODES.map(({ mode, icon: Icon, label }) => (
                  <button key={mode} onClick={() => setActiveMode(mode)}
                    className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all',
                      CHAT_MODES[mode].color, isLight ? 'border-black/10 hover:border-black/20 hover:bg-black/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5')}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <MessageBubble key={message.id} message={message}
                  isLast={index === lastAssistantIdx} onRegenerate={onRegenerate} isLoading={isLoading} />
              ))}
            </AnimatePresence>
          )}
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-0">
              <NimbusHeader mode={activeMode} />
              <div className={cn('border rounded-2xl rounded-tl-sm px-5 py-3 w-fit', isLight ? 'bg-white border-black/10' : 'bg-[#141416] border-white/8')}><TypingDots /></div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="px-6 pb-5 pt-3 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* Attached files preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {attachments.map((f, i) => (
                <FilePill key={i} file={f} onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}

          {/* Speech interim */}
          {interimTranscript && (
            <div className="px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300 italic">{interimTranscript}</p>
            </div>
          )}

          {/* Speech error */}
          {speechError && (
            <div className="px-4 py-2 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
              <p className="text-xs text-red-400">{speechError}</p>
              <button onClick={() => setSpeechError('')}><X className="h-3 w-3 text-red-400" /></button>
            </div>
          )}

          {/* Main input card */}
          <div className={cn('rounded-2xl overflow-hidden transition-colors border-2',
            speechStatus === 'listening'
              ? 'border-[#f05a28]'
              : isLight
                ? 'bg-white border-black/15 focus-within:border-[#f05a28]'
                : 'bg-[#141416] border-white/10 focus-within:border-[#f05a28]')}>

            {/* Enhance indicator */}
            {isEnhanced && (
              <div className="flex items-center gap-2 px-4 pt-2.5 pb-0">
                <Wand2 className="h-3 w-3 text-[#f05a28]" />
                <span className="text-[10px] text-[#f05a28] font-medium">
                  Enhanced {enhanceVariation > 1 ? `(variation ${enhanceVariation - 1})` : ''}
                </span>
                <button onClick={() => { setInput(originalInput); setIsEnhanced(false); setEnhanceVariation(0); }}
                  className={cn('ml-auto text-[10px] transition-colors', isLight ? 'text-gray-400 hover:text-gray-700' : 'text-gray-500 hover:text-gray-300')}>
                  Restore original
                </button>
              </div>
            )}

            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder={speechStatus === 'listening' ? 'Listening...' : 'Ask anything...'}
              rows={1} disabled={isLoading}
              className={cn('w-full bg-transparent px-4 pt-3.5 pb-2 text-sm resize-none focus:outline-none leading-relaxed', isLight ? 'text-gray-900 placeholder:text-gray-400' : 'text-white placeholder:text-gray-600')}
              style={{ minHeight: '44px', maxHeight: '128px' }} />

            <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
              {/* Mode chips */}
              <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                {PRIMARY_MODES.map(({ mode, icon: Icon, label }) => (
                  <button key={mode} onClick={() => handleModeChip(mode)}
                    className={cn('flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-lg transition-all',
                      activeMode === mode
                        ? cn(CHAT_MODES[mode].color, 'border-current bg-white/6 font-semibold')
                        : 'text-gray-400 hover:text-white border-white/10 hover:border-white/20 hover:bg-white/5')}>
                    <Icon className="h-3 w-3" />{label}
                  </button>
                ))}

                {/* More dropdown */}
                <div className="relative" ref={moreMenuRef}>
                  <button onClick={() => setShowMoreModes(!showMoreModes)}
                    className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all',
                      isMoreMode ? cn(activeModeConfig.color, 'bg-white/6 font-semibold border border-current')
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5')}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    {isMoreMode ? activeModeConfig.label : 'More'}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showMoreModes && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {showMoreModes && (
                      <MoreModesMenu activeMode={activeMode} onSelect={setActiveMode} onClose={() => setShowMoreModes(false)} />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Enhance */}
                <button onClick={handleEnhance} disabled={!input.trim() || enhancing}
                  title={isEnhanced ? 'Next variation / restore' : 'Enhance prompt'}
                  className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                    isEnhanced ? 'text-[#f05a28] bg-orange-500/10 hover:bg-orange-500/20'
                      : input.trim() ? isLight ? 'text-gray-500 hover:text-[#f05a28] hover:bg-black/5' : 'text-gray-400 hover:text-[#f05a28] hover:bg-white/8' : 'text-gray-700 cursor-not-allowed')}>
                  {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </button>

                {/* File attach */}
                <button onClick={() => fileInputRef.current?.click()}
                  className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all', isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/8')}
                  title="Attach file">
                  <Paperclip className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES}
                  onChange={handleFileSelect} className="hidden" />

                {/* Speech */}
                {isSpeechSupported() && (
                  <button onClick={toggleSpeech}
                    title={speechStatus === 'listening' ? 'Stop listening' : 'Voice input'}
                    className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                      speechStatus === 'listening'
                        ? 'bg-[#f05a28] text-white shadow-lg shadow-orange-600/30 animate-pulse'
                        : isLight ? 'text-gray-400 hover:text-[#f05a28] hover:bg-black/5' : 'text-gray-500 hover:text-[#f05a28] hover:bg-white/8')}>
                    {speechStatus === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}

                {/* Send */}
                <button onClick={handleSubmit} disabled={!input.trim() || isLoading}
                  className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all border',
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-br from-[#f05a28] to-[#e03020] text-white hover:from-[#f06a38] hover:to-[#e04030] shadow-lg shadow-orange-600/30 border-black/20'
                      : isLight ? 'bg-black/5 text-gray-400 cursor-not-allowed border-transparent' : 'bg-white/8 text-gray-600 cursor-not-allowed border-transparent')}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
