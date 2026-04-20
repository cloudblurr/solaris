# Nimbus AI

An AI-powered agent platform with a futuristic chat interface, built with Next.js 16, shadcn/ui, Framer Motion, and Digital Ocean Agent Platform.

## Features

- 🎨 **Futuristic UI**: Dark blue, gold, and black gradient theming
- 💬 **Multi-threaded Conversations**: Manage multiple chat threads with persistent memory
- 🚀 **Splash Screen**: Animated loading experience
- ⚡ **Quick Actions**: Pre-built prompts for common tasks
- 🧠 **Extensive Memory**: Per-user conversation history (mock authentication)
- 🎭 **Smooth Animations**: Framer Motion powered transitions
- 🎯 **Context Awareness**: Agent maintains context throughout conversations

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI Platform**: Digital Ocean Agent Platform

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   The `.env.local` file is already set up with your Digital Ocean Agent credentials.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
nimbus/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── splash-screen.tsx   # Animated splash screen
│   ├── sidebar.tsx         # Conversation threads sidebar
│   ├── chat-panel.tsx      # Main chat interface
│   └── quick-actions.tsx   # Quick action toolbar
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── agent.ts            # Digital Ocean Agent integration
│   └── memory.ts           # In-memory conversation storage
└── .env.local              # Environment variables
```

## Features Breakdown

### Splash Screen
- Animated loading screen with progress bar
- Cloud and sparkle animations
- Gradient text effects

### Sidebar
- List of conversation threads
- Create new conversations
- Delete existing threads
- Thread selection with visual feedback

### Chat Panel
- Message history display
- User and assistant avatars
- Real-time message streaming
- Typing indicators
- Timestamp display

### Quick Actions
- Pre-built prompt templates
- Brainstorm, Code Help, Summarize, Explain, Learn, Quick Task
- Recent topics tracking

### Memory System
- Per-user conversation storage
- Thread-based organization
- Automatic title generation from first message
- Context preservation across sessions

## Customization

### Theme Colors
Edit `app/globals.css` to customize the color scheme:
- Primary: Blue tones
- Accent: Gold/Yellow tones
- Background: Black and dark grays

### Agent Configuration
Update `.env.local` to change the Digital Ocean Agent endpoint and access key.

### Quick Actions
Modify `components/quick-actions.tsx` to add or customize quick action templates.

## Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

3. **Deploy to Vercel** (recommended):
   ```bash
   vercel deploy
   ```

## Environment Variables

- `NEXT_PUBLIC_AGENT_ENDPOINT`: Digital Ocean Agent API endpoint
- `NEXT_PUBLIC_AGENT_ACCESS_KEY`: API access key

## Notes

- Currently uses mock authentication (`user_demo`)
- In-memory storage (replace with database for production)
- Agent API integration may need adjustment based on actual API response format

## License

MIT
