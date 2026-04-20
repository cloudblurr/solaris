'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Download,
  ChevronLeft,
  Copy,
  Settings,
  Play,
  Pause,
  Check,
  ExternalLink,
  Code,
  FileText,
  Image as ImageIcon,
  Zap,
  Shield,
  Users,
  Calendar,
  Tag,
  Heart,
  Share2,
  AlertCircle,
  Sparkles,
  Bot,
  Cloud,
  MessageSquare,
  Wand2,
  BookOpen,
  Lightbulb,
  Puzzle,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketplaceItem, MarketplaceCategory } from './explore-marketplace';

interface MarketplaceProductPageProps {
  item: MarketplaceItem;
  onBack: () => void;
  onInstall: (item: MarketplaceItem, config?: any) => void;
  onClose: () => void;
}

export default function MarketplaceProductPage({
  item,
  onBack,
  onInstall,
  onClose,
}: MarketplaceProductPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'changelog'>('overview');
  const [isInstalling, setIsInstalling] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [installed, setInstalled] = useState(false);

  const handleInstall = async (customConfig?: any) => {
    setIsInstalling(true);
    
    // Simulate installation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    onInstall(item, customConfig || config);
    setInstalled(true);
    setIsInstalling(false);
  };

  const getCategoryConfig = () => {
    switch (item.category) {
      case 'agents':
        return {
          icon: Bot,
          color: 'blue',
          actions: [
            { label: 'Clone & Customize', action: 'clone', primary: true },
            { label: 'Add to Sky-Way', action: 'add', primary: false },
            { label: 'Quick Deploy', action: 'deploy', primary: false },
          ],
          configFields: [
            { name: 'name', label: 'Agent Name', type: 'text', default: item.name },
            { name: 'personality', label: 'Personality', type: 'textarea', default: 'Professional and helpful' },
            { name: 'instructions', label: 'System Instructions', type: 'textarea', default: '' },
            { name: 'temperature', label: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.7 },
            { name: 'knowledge_base', label: 'Knowledge Base', type: 'file', default: null },
          ],
        };
      case 'clouds':
        return {
          icon: Cloud,
          color: 'purple',
          actions: [
            { label: 'Clone & Configure', action: 'clone', primary: true },
            { label: 'Deploy to Background', action: 'deploy', primary: false },
            { label: 'Schedule Run', action: 'schedule', primary: false },
          ],
          configFields: [
            { name: 'name', label: 'Cloud Name', type: 'text', default: item.name },
            { name: 'schedule', label: 'Run Schedule', type: 'select', options: ['Manual', 'Every Hour', 'Every Day', 'Every Week'], default: 'Manual' },
            { name: 'auto_start', label: 'Auto-start on Boot', type: 'checkbox', default: false },
            { name: 'notifications', label: 'Enable Notifications', type: 'checkbox', default: true },
          ],
        };
      case 'characters':
        return {
          icon: Users,
          color: 'pink',
          actions: [
            { label: 'Import Character', action: 'import', primary: true },
            { label: 'View Details', action: 'view', primary: false },
            { label: 'Start Roleplay', action: 'roleplay', primary: false },
          ],
          configFields: [
            { name: 'name', label: 'Character Name', type: 'text', default: item.name },
            { name: 'scenario', label: 'Starting Scenario', type: 'textarea', default: '' },
            { name: 'memory_length', label: 'Memory Length', type: 'number', default: 2000 },
          ],
        };
      case 'apps':
        return {
          icon: Puzzle,
          color: 'green',
          actions: [
            { label: 'Launch App', action: 'launch', primary: true },
            { label: 'Install to Dashboard', action: 'install', primary: false },
            { label: 'Configure', action: 'config', primary: false },
          ],
          configFields: [
            { name: 'instance_name', label: 'Instance Name', type: 'text', default: item.name },
            { name: 'auto_launch', label: 'Auto-launch', type: 'checkbox', default: false },
          ],
        };
      case 'solutions':
        return {
          icon: Lightbulb,
          color: 'yellow',
          actions: [
            { label: 'Apply Solution', action: 'apply', primary: true },
            { label: 'Customize', action: 'customize', primary: false },
            { label: 'Preview', action: 'preview', primary: false },
          ],
          configFields: [
            { name: 'name', label: 'Solution Name', type: 'text', default: item.name },
            { name: 'auto_apply', label: 'Auto-apply on Detection', type: 'checkbox', default: false },
          ],
        };
      case 'prompts':
        return {
          icon: FileText,
          color: 'orange',
          actions: [
            { label: 'Use in Current Chat', action: 'current', primary: true },
            { label: 'Open New Chat', action: 'new', primary: false },
            { label: 'Clone & Edit', action: 'clone', primary: false },
          ],
          configFields: [
            { name: 'prompt_text', label: 'Prompt Template', type: 'textarea', default: '' },
            { name: 'variables', label: 'Variables', type: 'text', default: '' },
          ],
        };
      case 'addons':
        return {
          icon: Wand2,
          color: 'cyan',
          actions: [
            { label: 'Install Add-on', action: 'install', primary: true },
            { label: 'Configure', action: 'config', primary: false },
          ],
          configFields: [
            { name: 'enabled', label: 'Enable on Install', type: 'checkbox', default: true },
            { name: 'shortcut', label: 'Keyboard Shortcut', type: 'text', default: '' },
          ],
        };
      case 'guides':
        return {
          icon: BookOpen,
          color: 'indigo',
          actions: [
            { label: 'Open Guide', action: 'open', primary: true },
            { label: 'Save to Library', action: 'save', primary: false },
          ],
          configFields: [],
        };
      default:
        return {
          icon: Puzzle,
          color: 'gray',
          actions: [{ label: 'Install', action: 'install', primary: true }],
          configFields: [],
        };
    }
  };

  const categoryConfig = getCategoryConfig();
  const CategoryIcon = categoryConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#0d0d0d] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{item.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{item.name}</h1>
              <p className="text-xs text-gray-500">by {item.author}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm text-white font-medium">{item.rating}</span>
          <span className="text-xs text-gray-500">(1.2k reviews)</span>
        </div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-white">{item.downloads.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <CategoryIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400 capitalize">{item.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Updated 2 days ago</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/5">
        {(['overview', 'reviews', 'changelog'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
              activeTab === tab
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">About</h2>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
                <p className="text-gray-400 leading-relaxed mt-4">
                  This {item.category.slice(0, -1)} provides advanced functionality with seamless integration into your NimbusAI workflow. 
                  Built with performance and reliability in mind, it offers extensive customization options to fit your specific needs.
                </p>
              </div>

              {/* Features */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Key Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon: Zap, label: 'High Performance', desc: 'Optimized for speed and efficiency' },
                    { icon: Shield, label: 'Secure', desc: 'Built with security best practices' },
                    { icon: Sparkles, label: 'AI-Powered', desc: 'Leverages advanced AI capabilities' },
                    { icon: Settings, label: 'Customizable', desc: 'Extensive configuration options' },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <feature.icon className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-white">{feature.label}</div>
                        <div className="text-xs text-gray-500">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshots/Preview */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Preview</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="aspect-video rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center"
                    >
                      <ImageIcon className="h-12 w-12 text-gray-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Requirements</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>NimbusAI v1.0 or higher</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>Active internet connection</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>50MB available storage</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Productivity', 'Automation', 'Popular', 'Featured'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium bg-white/10 text-gray-400 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">User Reviews</h2>
                <button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors">
                  Write a Review
                </button>
              </div>

              {/* Review Summary */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">{item.rating}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < Math.floor(item.rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">1,234 reviews</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8">{stars}★</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500"
                            style={{ width: `${Math.random() * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold">
                        U{i}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">User {i}</div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Star
                              key={j}
                              className={cn(
                                'h-3 w-3',
                                j < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">2 days ago</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Great {item.category.slice(0, -1)}! Works perfectly and integrates seamlessly with my workflow. 
                    Highly recommended for anyone looking to enhance their NimbusAI experience.
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Version History</h2>
              
              {[
                { version: '2.1.0', date: '2 days ago', changes: ['Added new features', 'Performance improvements', 'Bug fixes'] },
                { version: '2.0.0', date: '1 week ago', changes: ['Major update', 'New UI', 'Breaking changes'] },
                { version: '1.5.2', date: '2 weeks ago', changes: ['Minor bug fixes', 'Security updates'] },
              ].map((release) => (
                <div key={release.version} className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">v{release.version}</span>
                    </div>
                    <span className="text-xs text-gray-500">{release.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {release.changes.map((change, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 border-t border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <Heart className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!installed && categoryConfig.configFields.length > 0 && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure
              </button>
            )}
            
            {categoryConfig.actions.map((action) => (
              <button
                key={action.action}
                onClick={() => action.action === 'clone' ? setShowConfig(true) : handleInstall()}
                disabled={isInstalling}
                className={cn(
                  'px-6 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                  action.primary
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    : 'bg-white/10 hover:bg-white/15 text-white',
                  isInstalling && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isInstalling ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Installing...
                  </>
                ) : installed ? (
                  <>
                    <Check className="h-4 w-4" />
                    Installed
                  </>
                ) : (
                  <>
                    {action.action === 'clone' && <Copy className="h-4 w-4" />}
                    {action.action === 'deploy' && <Play className="h-4 w-4" />}
                    {action.action === 'launch' && <ExternalLink className="h-4 w-4" />}
                    {action.label}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfig && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfig(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Configure {item.name}</h2>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {categoryConfig.configFields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'text' && (
                        <input
                          type="text"
                          defaultValue={typeof field.default === 'string' ? field.default : ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                        />
                      )}
                      {field.type === 'textarea' && (
                        <textarea
                          defaultValue={typeof field.default === 'string' ? field.default : ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 resize-none"
                        />
                      )}
                      {field.type === 'checkbox' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={typeof field.default === 'boolean' ? field.default : false}
                            onChange={(e) => setConfig({ ...config, [field.name]: e.target.checked })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-yellow-500 focus:ring-yellow-500"
                          />
                          <span className="text-sm text-gray-400">Enable this option</span>
                        </label>
                      )}
                      {field.type === 'select' && 'options' in field && field.options && (
                        <select
                          defaultValue={typeof field.default === 'string' ? field.default : ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
                        >
                          {field.options.map((option: string) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === 'slider' && 'min' in field && 'max' in field && 'step' in field && (
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            defaultValue={typeof field.default === 'number' ? field.default : 0}
                            onChange={(e) => setConfig({ ...config, [field.name]: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 text-right">
                            {config[field.name] || field.default}
                          </div>
                        </div>
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          defaultValue={typeof field.default === 'number' ? field.default : 0}
                          onChange={(e) => setConfig({ ...config, [field.name]: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleInstall(config);
                      setShowConfig(false);
                    }}
                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors"
                  >
                    Install with Configuration
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
