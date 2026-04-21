'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Sparkles, Bot, Cloud, Users, Puzzle, Wand2, FileText,
  BookOpen, Lightbulb, X, ChevronRight, Star, Download, Compass,
  Rocket, Loader2, Plus, Check, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MarketplaceProductPage from './marketplace-product-page';

interface ExploreMarketplaceProps {
  onClose: () => void;
  onSelectItem: (item: MarketplaceItem) => void;
  onInstallAgent?: (agent: MarketplaceItem, config: any) => void;
  onInstallCloud?: (cloud: MarketplaceItem, config: any) => void;
  onInstallCharacter?: (character: MarketplaceItem, config: any) => void;
  onLaunchApp?: (app: MarketplaceItem, config: any) => void;
  onApplySolution?: (solution: MarketplaceItem, config: any) => void;
  onUsePrompt?: (prompt: MarketplaceItem, inCurrentChat: boolean) => void;
  onInstallAddon?: (addon: MarketplaceItem, config: any) => void;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  icon: string;
  author: string;
  downloads: number;
  rating: number;
  featured?: boolean;
}

export type MarketplaceCategory =
  | 'agents' | 'clouds' | 'characters' | 'apps'
  | 'solutions' | 'guides' | 'prompts' | 'addons';

export const categories: { id: MarketplaceCategory; label: string; icon: React.ElementType; count: number }[] = [
  { id: 'agents',     label: 'Nimbus Agents', icon: Bot,       count: 24 },
  { id: 'clouds',     label: 'Nimbus Clouds', icon: Cloud,     count: 12 },
  { id: 'characters', label: 'Characters',    icon: Users,     count: 36 },
  { id: 'apps',       label: 'Apps',          icon: Puzzle,    count: 18 },
  { id: 'solutions',  label: 'Solutions',     icon: Lightbulb, count: 8  },
  { id: 'guides',     label: 'Guides',        icon: BookOpen,  count: 15 },
  { id: 'prompts',    label: 'Prompts',       icon: FileText,  count: 42 },
  { id: 'addons',     label: 'Add-Ons',       icon: Wand2,     count: 22 },
];

// Static fallback data
const staticItems: MarketplaceItem[] = [
  { id: 'agent-core',     name: 'Nimbus Core',     description: 'General purpose AI assistant with deep reasoning',          category: 'agents',     icon: '☁️', author: 'NimbusAI',  downloads: 15420, rating: 4.9, featured: true },
  { id: 'agent-dev',      name: 'Nimbus Dev',      description: 'Software development expert for coding and architecture',   category: 'agents',     icon: '💻', author: 'NimbusAI',  downloads: 8930,  rating: 4.8, featured: true },
  { id: 'agent-research', name: 'Nimbus Research', description: 'Research & analysis agent for data synthesis',              category: 'agents',     icon: '🔬', author: 'NimbusAI',  downloads: 5620,  rating: 4.7 },
  { id: 'agent-creative', name: 'Nimbus Creative', description: 'Content creation, brainstorming, and creative writing',     category: 'agents',     icon: '🎨', author: 'NimbusAI',  downloads: 7210,  rating: 4.8 },
  { id: 'cloud-sched',    name: 'Scheduler',       description: 'Automated task scheduling and reminder management',         category: 'clouds',     icon: '⏰', author: 'NimbusAI',  downloads: 6780,  rating: 4.7 },
  { id: 'cloud-research', name: 'Bg Researcher',   description: 'Continuous research on specified topics',                   category: 'clouds',     icon: '🔍', author: 'NimbusAI',  downloads: 3890,  rating: 4.6 },
  { id: 'char-mentor',    name: 'Mentor Persona',  description: 'Career and life guidance expert',                           category: 'characters', icon: '🧙', author: 'Community', downloads: 3210,  rating: 4.7 },
  { id: 'app-code',       name: 'Code Runner',     description: 'Execute and test code in multiple languages',               category: 'apps',       icon: '⚡', author: 'NimbusAI',  downloads: 6780,  rating: 4.9, featured: true },
  { id: 'app-mindmap',    name: 'Mind Mapper',     description: 'Create visual mind maps and flowcharts',                    category: 'apps',       icon: '🗺️', author: 'NimbusAI',  downloads: 5430,  rating: 4.6 },
  { id: 'sol-debug',      name: 'Debug Assistant', description: 'Intelligent debugging and error resolution',                category: 'solutions',  icon: '🐛', author: 'NimbusAI',  downloads: 5670,  rating: 4.8 },
  { id: 'sol-docs',       name: 'Doc Generator',   description: 'Auto-generate documentation from code',                    category: 'solutions',  icon: '📄', author: 'NimbusAI',  downloads: 4230,  rating: 4.6 },
  { id: 'guide-start',    name: 'Getting Started', description: 'Complete guide for new NimbusAI users',                    category: 'guides',     icon: '🚀', author: 'NimbusAI',  downloads: 12340, rating: 4.9 },
  { id: 'guide-adv',      name: 'Advanced Guide',  description: 'Master advanced NimbusAI features',                        category: 'guides',     icon: '📈', author: 'NimbusAI',  downloads: 6780,  rating: 4.7 },
  { id: 'prompt-review',  name: 'Code Review',     description: 'Systematic code review template with best practices',      category: 'prompts',    icon: '📝', author: 'Community', downloads: 7890,  rating: 4.5 },
  { id: 'prompt-explain', name: 'Explain Code',    description: 'Detailed code explanation prompt',                          category: 'prompts',    icon: '💡', author: 'Community', downloads: 6540,  rating: 4.6 },
  { id: 'addon-translate',name: 'Translator',      description: 'Multi-language translation with context awareness',         category: 'addons',     icon: '🌐', author: 'NimbusAI',  downloads: 9870,  rating: 4.8 },
  { id: 'addon-summarize',name: 'Summarizer',      description: 'Quick intelligent content summarization',                   category: 'addons',     icon: '📋', author: 'NimbusAI',  downloads: 8760,  rating: 4.7 },
];

export default function ExploreMarketplace({
  onClose, onSelectItem,
  onInstallAgent, onInstallCloud, onInstallCharacter,
  onLaunchApp, onApplySolution, onUsePrompt, onInstallAddon,
}: ExploreMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'browse' | 'featured' | 'installed'>('browse');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [dbItems, setDbItems] = useState<MarketplaceItem[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => { fetchMarketplace(); }, []);

  const fetchMarketplace = async () => {
    try {
      setDbLoading(true);
      const res = await fetch('/api/marketplace');
      const data = await res.json();
      if (data.entries?.length) {
        setDbItems(data.entries.map((e: any) => ({
          id: e.id, name: e.name, description: e.description,
          category: e.category as MarketplaceCategory,
          icon: e.icon, author: e.author_name,
          downloads: e.downloads, rating: e.rating,
          featured: e.status === 'featured',
        })));
      }
      if (data.installedIds) setInstalledIds(data.installedIds);
    } catch {
      setDbItems(staticItems);
    } finally {
      setDbLoading(false);
    }
  };

  const allItems = dbItems.length > 0 ? dbItems : staticItems;

  const handleInstall = async (item: MarketplaceItem, config?: any) => {
    try {
      await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: item.id, config }),
      });
    } catch { /* non-fatal */ }
    setInstalledIds((prev) => [...new Set([...prev, item.id])]);
    switch (item.category) {
      case 'agents':     onInstallAgent?.(item, config); break;
      case 'clouds':     onInstallCloud?.(item, config); break;
      case 'characters': onInstallCharacter?.(item, config); break;
      case 'apps':       onLaunchApp?.(item, config); break;
      case 'solutions':  onApplySolution?.(item, config); break;
      case 'prompts':    onUsePrompt?.(item, config?.inCurrentChat ?? true); break;
      case 'addons':     onInstallAddon?.(item, config); break;
    }
    onSelectItem(item);
  };

  if (selectedItem) {
    return (
      <MarketplaceProductPage
        item={selectedItem}
        onBack={() => setSelectedItem(null)}
        onInstall={handleInstall}
        onClose={onClose}
      />
    );
  }

  const filteredItems = allItems.filter((item) => {
    const matchSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchTab = activeTab === 'browse' ||
      (activeTab === 'featured' && item.featured) ||
      (activeTab === 'installed' && installedIds.includes(item.id));
    return matchSearch && matchCat && matchTab;
  });

  const featuredItems = allItems.filter((i) => i.featured);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#0d0d0d] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <Compass className="h-6 w-6 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Explore</h1>
          <span className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded-full">Marketplace</span>
          {dbLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-600" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg border border-yellow-500/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Submit
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/5">
        {(['browse', 'featured', 'installed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
              activeTab === tab ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab}
            {tab === 'installed' && installedIds.length > 0 && (
              <span className="ml-1.5 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                {installedIds.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Category Pills */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search marketplace…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
              selectedCategory === 'all' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400 hover:text-white')}
          >All</button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                selectedCategory === cat.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400 hover:text-white')}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'featured' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Featured</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredItems.map((item) => (
                <ItemCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} installed={installedIds.includes(item.id)} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'installed' && (
          installedIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Download className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nothing installed yet</h3>
              <p className="text-sm text-gray-500">Browse the marketplace to discover and install items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} installed />
              ))}
            </div>
          )
        )}

        {activeTab === 'browse' && (
          selectedCategory === 'all' ? (
            <div className="space-y-8">
              {categories.map((cat) => {
                const catItems = allItems.filter((i) => i.category === cat.id);
                if (!catItems.length) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4 text-yellow-400" />
                        <h3 className="text-sm font-medium text-white">{cat.label}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedCategory(cat.id)}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {catItems.slice(0, 5).map((item) => (
                        <ItemCard key={item.id} item={item} compact onSelect={() => setSelectedItem(item)} installed={installedIds.includes(item.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} installed={installedIds.includes(item.id)} />
              ))}
              {filteredItems.length === 0 && !dbLoading && (
                <div className="col-span-full flex flex-col items-center justify-center h-48 text-center">
                  <Search className="h-10 w-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">No results found</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmit && (
          <SubmitModal
            onClose={() => setShowSubmit(false)}
            onSubmitted={() => { setShowSubmit(false); fetchMarketplace(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Item Card ──────────────────────────────────────────────────────────────────
function ItemCard({ item, compact, onSelect, installed }: {
  item: MarketplaceItem;
  compact?: boolean;
  onSelect: () => void;
  installed?: boolean;
}) {
  if (compact) {
    return (
      <button
        onClick={onSelect}
        className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/30 transition-all relative"
      >
        {installed && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-400 rounded-full" />}
        <div className="flex items-center gap-2">
          <span className="text-xl">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{item.name}</div>
            <div className="text-[10px] text-gray-500 truncate">{item.author}</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/30 transition-all group relative"
    >
      {installed && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
            {item.featured && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />}
          </div>
          <p className="text-xs text-gray-500">{item.author}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{item.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />{item.downloads.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />{item.rating}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
      </div>
    </button>
  );
}

// ── Submit Modal ───────────────────────────────────────────────────────────────
function SubmitModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    name: '', description: '', long_description: '',
    category: 'agents' as MarketplaceCategory, icon: '✨', tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) { setError('Name and description are required'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); return; }
      setReviewNote(data.entry?.review_notes || '');
      setSubmitted(true);
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-semibold text-white">Submit to Marketplace</h2>
              <p className="text-xs text-gray-500">AI-reviewed before publishing</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Submitted!</h3>
              <p className="text-sm text-gray-400">
                {reviewNote?.includes('Pending')
                  ? "Your submission is pending manual review. We'll notify you when it's approved."
                  : 'Your submission was auto-approved and is now live!'}
              </p>
              {reviewNote && (
                <div className="p-3 bg-white/5 rounded-lg text-xs text-gray-400 text-left">
                  <span className="text-gray-500 font-medium">AI Review: </span>{reviewNote}
                </div>
              )}
              <button onClick={onSubmitted} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors">
                Done
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="My Awesome Agent"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Category *</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MarketplaceCategory }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500/50">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Short Description *</label>
                <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this do?"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Description</label>
                <textarea value={form.long_description} onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))}
                  placeholder="Detailed description, use cases, features…" rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Icon (emoji)</label>
                  <input type="text" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="✨"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Tags (comma-separated)</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="coding, ai, productivity"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                </div>
              </div>
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-400">AI Review</span>
                </div>
                <p className="text-xs text-gray-500">
                  Submissions are automatically reviewed by AI for quality and safety. Approved items go live immediately.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {submitting ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
