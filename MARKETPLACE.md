# NimbusAI Marketplace - Feature Documentation

## Overview
The Explore Marketplace is a fully interactive, immersive feature hub where users can discover, install, and manage various NimbusAI extensions including agents, clouds, characters, apps, solutions, guides, prompts, and add-ons.

## Architecture

### Components
1. **ExploreMarketplace** (`components/explore-marketplace.tsx`)
   - Main marketplace browser with search, filtering, and categorization
   - Three tabs: Browse, Featured, Installed
   - Category-based navigation with item counts
   - Responsive grid layout

2. **MarketplaceProductPage** (`components/marketplace-product-page.tsx`)
   - Detailed product pages for each marketplace item
   - Three tabs: Overview, Reviews, Changelog
   - Category-specific configuration forms
   - Installation workflows with customization options

### Categories & Functionality

#### 1. **Nimbus Agents** 🤖
- **Purpose**: AI agents with specific personalities and capabilities
- **Actions**:
  - Clone & Customize: Full configuration of personality, instructions, temperature
  - Add to Sky-Way: Install to agent switcher (up to 5 agents)
  - Quick Deploy: Instant deployment with defaults
- **Configuration**:
  - Agent Name
  - Personality traits
  - System instructions
  - Temperature (0-1 slider)
  - Knowledge base upload
- **Integration**: Saves to Sky-Way panel for quick switching

#### 2. **Nimbus Clouds** ☁️
- **Purpose**: Background agents that run automated tasks
- **Actions**:
  - Clone & Configure: Customize scheduling and behavior
  - Deploy to Background: Start running immediately
  - Schedule Run: Set up automated execution
- **Configuration**:
  - Cloud Name
  - Run Schedule (Manual, Hourly, Daily, Weekly)
  - Auto-start on boot
  - Notification preferences
- **Integration**: Runs as background process, shows in notifications

#### 3. **Characters** 👥
- **Purpose**: Roleplay personas with embedded character data (PNG format with JSON metadata)
- **Actions**:
  - Import Character: Parse PNG metadata
  - View Details: See full character profile
  - Start Roleplay: Begin interactive session
- **Configuration**:
  - Character Name
  - Starting Scenario
  - Memory Length (context window)
- **Format**: PNG files with embedded JSON (chub.ai compatible)
- **Integration**: Saves to character library for roleplay mode

#### 4. **Apps** 🧩
- **Purpose**: Standalone applications that run within NimbusAI
- **Actions**:
  - Launch App: Open in new window/iframe
  - Install to Dashboard: Add to quick access
  - Configure: Set app-specific settings
- **Configuration**:
  - Instance Name
  - Auto-launch preference
- **URL Structure**: `/apps/{userId}/{appId}`
- **Integration**: Opens in new window or embedded iframe

#### 5. **Solutions** 💡
- **Purpose**: Pre-built workflows for specific tasks
- **Actions**:
  - Apply Solution: Implement immediately
  - Customize: Modify before applying
  - Preview: See what it does
- **Configuration**:
  - Solution Name
  - Auto-apply on detection
- **Integration**: Similar to agents but task-focused

#### 6. **Guides** 📚
- **Purpose**: Documentation and tutorials
- **Actions**:
  - Open Guide: View in reader
  - Save to Library: Bookmark for later
- **Integration**: Opens in reading mode, saves to Library

#### 7. **Prompts** 📝
- **Purpose**: Reusable prompt templates
- **Actions**:
  - Use in Current Chat: Insert into active conversation
  - Open New Chat: Start fresh conversation with prompt
  - Clone & Edit: Customize the template
- **Configuration**:
  - Prompt Template text
  - Variables/placeholders
- **Integration**: Directly inserts into chat or creates new thread

#### 8. **Add-ons** ✨
- **Purpose**: UI enhancements and new capabilities
- **Actions**:
  - Install Add-on: Add to interface
  - Configure: Set preferences
- **Configuration**:
  - Enable on install
  - Keyboard shortcuts
- **Examples**: Translator, Summarizer, TTS, OCR
- **Integration**: Modifies UI, requires refresh to activate

## User Experience Flow

### Discovery
1. User clicks "Explore" in sidebar
2. Marketplace replaces chat panel (full-screen experience)
3. Browse by category or search
4. View featured items or installed items

### Product Page
1. Click any item to view detailed product page
2. See overview, features, screenshots, requirements
3. Read user reviews and ratings
4. Check version history and changelog
5. View tags and related items

### Installation
1. Click primary action button (e.g., "Clone & Customize")
2. Configuration modal appears with category-specific fields
3. User customizes settings
4. Click "Install with Configuration"
5. Item is installed and added to appropriate area
6. Success notification shown
7. Item appears in "Installed" tab

### Post-Installation
- **Agents**: Available in Sky-Way switcher
- **Clouds**: Running in background, visible in notifications
- **Characters**: Available in character library
- **Apps**: Accessible via unique URL
- **Solutions**: Applied to workflow
- **Prompts**: Available in prompt library
- **Add-ons**: Active in interface (after refresh)
- **Guides**: Saved in Library

## Technical Implementation

### State Management
```typescript
const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
const [installedItems, setInstalledItems] = useState<string[]>([]);
const [activePanel, setActivePanel] = useState<PanelType>(null);
```

### Installation Handlers
Each category has a dedicated handler in `app/page.tsx`:
- `handleInstallAgent(agent, config)`
- `handleInstallCloud(cloud, config)`
- `handleInstallCharacter(character, config)`
- `handleLaunchApp(app, config)`
- `handleApplySolution(solution, config)`
- `handleUsePrompt(prompt, inCurrentChat)`
- `handleInstallAddon(addon, config)`

### Data Structure
```typescript
interface MarketplaceItem {
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
```

## Future Enhancements

### Planned Features
1. **User-Generated Content**: Allow users to publish their own items
2. **Ratings & Reviews**: Full review system with voting
3. **Collections**: Curated bundles of related items
4. **Subscriptions**: Premium marketplace items
5. **Updates**: Auto-update installed items
6. **Dependencies**: Handle item dependencies
7. **Permissions**: Granular permission system
8. **Analytics**: Track usage and performance
9. **Recommendations**: AI-powered suggestions
10. **Social Features**: Share, like, comment on items

### Integration Points
- **Sky-Way**: Agent management and switching
- **Library**: File and content storage
- **Spaces**: Project-specific installations
- **Settings**: Global marketplace preferences
- **Notifications**: Installation progress and updates

## Design Principles

1. **Immersive**: Full-screen experience, not a sidebar
2. **Interactive**: Click-through product pages with rich details
3. **Configurable**: Every item can be customized before installation
4. **Integrated**: Seamlessly connects with other NimbusAI features
5. **Discoverable**: Easy browsing, search, and filtering
6. **Trustworthy**: Ratings, reviews, download counts
7. **Extensible**: Easy to add new categories and item types

## Icons
All icons use Lucide React for consistency:
- Search, Star, Download, ChevronRight (navigation)
- Bot, Cloud, Users, Puzzle (categories)
- Settings, Play, Check, X (actions)
- Heart, Share2 (social)
- And many more...

## Styling
- Dark theme with yellow accents
- Glassmorphism effects (bg-white/5, border-white/10)
- Smooth animations with Framer Motion
- Responsive grid layouts
- Hover states and transitions
- Badge indicators for installed items

## Summary
The Explore Marketplace is a comprehensive, production-ready feature that transforms NimbusAI into an extensible platform. Users can discover, customize, and install a wide variety of enhancements, each with category-specific workflows and deep integration into the core application.
