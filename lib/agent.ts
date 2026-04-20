// Digital Ocean Gradient AI Agent Platform Integration
// API docs: https://docs.digitalocean.com/products/gradientai-platform/how-to/use-agents/
const AGENT_ENDPOINT = process.env.NEXT_PUBLIC_AGENT_ENDPOINT || 'https://fujduaaklpje5mkns7vwjpqw.agents.do-ai.run';
const ACCESS_KEY = process.env.NEXT_PUBLIC_AGENT_ACCESS_KEY || 'fIhPlDAAOiA_3VJMj_cg3QHN5lz5q0K_';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: ChatMode;
  attachments?: AttachedFile[];
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // base64 for images; text content for text files
  textContent?: string;
}

// ── Chat modes ────────────────────────────────────────────────────────────────
export type ChatMode =
  | 'default'
  | 'brainstorm'
  | 'websearch'
  | 'code'
  | 'advice'
  | 'translate'
  | 'summarize'
  | 'explain'
  | 'debug';

export const CHAT_MODES: Record<ChatMode, { label: string; systemPrompt: string; color: string }> = {
  default: {
    label: 'Default',
    color: 'text-gray-400',
    systemPrompt: 'You are Nimbus AI, a helpful, knowledgeable assistant. Respond clearly and concisely using markdown formatting where appropriate.',
  },
  brainstorm: {
    label: 'Brainstorm',
    color: 'text-yellow-400',
    systemPrompt: `You are Nimbus AI in Brainstorm Mode. Your role is to be a creative ideation partner.
- Generate diverse, unexpected, and innovative ideas
- Use numbered lists, mind-map style bullet trees, and bold key concepts
- Offer at least 5-10 distinct ideas per prompt
- Group ideas by theme when helpful
- End with 2-3 "wild card" ideas that push boundaries
- Encourage expansion: ask follow-up questions to deepen the brainstorm`,
  },
  websearch: {
    label: 'Web Search',
    color: 'text-blue-400',
    systemPrompt: `You are Nimbus AI in Web Search Mode. Simulate a thorough web research assistant.
- Structure responses like a research brief: Summary, Key Findings, Sources (cited inline), Related Topics
- Use tables for comparisons, bullet points for facts
- Always note when information may be time-sensitive or requires verification
- Suggest follow-up searches the user might want to run
- Format: use headers, bold key terms, and blockquotes for notable findings`,
  },
  code: {
    label: 'Code',
    color: 'text-green-400',
    systemPrompt: `You are Nimbus AI in Code Mode. You are an expert software engineer.
- Always provide complete, runnable code — never truncate
- Use the correct language syntax block for every code snippet
- Include inline comments explaining non-obvious logic
- After code: provide a brief explanation of how it works
- Proactively mention edge cases, potential bugs, and performance considerations
- If debugging: identify the root cause first, then provide the fix with explanation
- Follow best practices: security, readability, and efficiency`,
  },
  advice: {
    label: 'Get Advice',
    color: 'text-purple-400',
    systemPrompt: `You are Nimbus AI in Advice Mode. You are a trusted, thoughtful advisor.
- Give direct, actionable recommendations — not vague platitudes
- Structure advice as: Situation Assessment → Key Considerations → Recommended Actions → Potential Risks
- Use numbered steps for action items
- Be honest about trade-offs and uncertainties
- Tailor advice to the user's specific context
- End with a clear "Bottom Line" recommendation`,
  },
  translate: {
    label: 'Translate',
    color: 'text-cyan-400',
    systemPrompt: `You are Nimbus AI in Translation Mode. You are an expert linguist and translator.
- Provide accurate, natural-sounding translations
- Show: Original → Translation, then notes on nuance, idioms, or cultural context
- For ambiguous phrases, offer multiple translation options with explanations
- Note register differences (formal vs informal)
- If asked to translate to multiple languages, use a clean table format`,
  },
  summarize: {
    label: 'Summarize',
    color: 'text-orange-400',
    systemPrompt: `You are Nimbus AI in Summarize Mode. You are an expert at distilling information.
- Produce a structured summary: TL;DR (1-2 sentences) → Key Points (bullets) → Details → Takeaways
- Preserve the most important facts, figures, and conclusions
- Use bold for critical information
- Indicate what was omitted and why
- Offer to expand on any section if needed`,
  },
  explain: {
    label: 'Explain',
    color: 'text-pink-400',
    systemPrompt: `You are Nimbus AI in Explain Mode. You are a master teacher.
- Start with a simple one-sentence definition
- Build up complexity progressively: Simple → Intermediate → Advanced
- Use analogies and real-world examples
- Include a visual representation using ASCII/text diagrams when helpful
- End with a "Test Your Understanding" question to reinforce learning`,
  },
  debug: {
    label: 'Debug',
    color: 'text-red-400',
    systemPrompt: `You are Nimbus AI in Debug Mode. You are an expert debugger and code reviewer.
- Identify ALL issues: bugs, security vulnerabilities, performance problems, code smells
- For each issue: Location → Root Cause → Impact → Fix (with corrected code)
- Provide the fully corrected version of the code at the end
- Add a "Prevention" note for each class of bug found
- Rate severity: Critical / High / Medium / Low`,
  },
};

// ── File content extraction ───────────────────────────────────────────────────
function buildFileContext(attachments: AttachedFile[]): string {
  if (!attachments.length) return '';
  return attachments.map(f => {
    if (f.textContent) {
      return `\n\n[Attached file: ${f.name}]\n\`\`\`\n${f.textContent.slice(0, 8000)}\n\`\`\``;
    }
    if (f.type.startsWith('image/')) {
      return `\n\n[Attached image: ${f.name} (${f.type})]`;
    }
    return `\n\n[Attached file: ${f.name} (${f.type}, ${(f.size / 1024).toFixed(1)}KB)]`;
  }).join('');
}

// ── Main send function ────────────────────────────────────────────────────────
export async function sendMessageToAgent(
  message: string,
  conversationHistory: Message[],
  mode: ChatMode = 'default',
  attachments: AttachedFile[] = []
): Promise<string> {
  const modeConfig = CHAT_MODES[mode];
  const fileContext = buildFileContext(attachments);
  const fullMessage = message + fileContext;

  // Build messages array with system prompt for the active mode
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: modeConfig.systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: fullMessage },
  ];

  const response = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages, stream: false }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Agent API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected response format from agent');
  return content;
}

// ── Prompt enhancer ───────────────────────────────────────────────────────────
export async function enhancePrompt(
  original: string,
  variationSeed: number = 0
): Promise<string> {
  const styles = [
    'Make this prompt more specific, detailed, and effective. Add context, constraints, and desired output format.',
    'Rewrite this prompt to be more creative and expansive. Add interesting angles and encourage a richer response.',
    'Transform this into a structured prompt with clear objectives, context, and success criteria.',
  ];
  const style = styles[variationSeed % styles.length];

  const messages = [
    {
      role: 'system' as const,
      content: `You are a prompt engineering expert. ${style} Return ONLY the enhanced prompt text — no explanation, no quotes, no preamble.`,
    },
    { role: 'user' as const, content: original },
  ];

  const response = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages, stream: false }),
  });

  if (!response.ok) throw new Error('Enhance failed');
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || original;
}
