/**
 * lib/roleplay-engine.ts
 * Dual-model roleplay engine: Hermes 3 (uncensored) + Grok (reasoning)
 */

export interface RoleplayCharacter {
  id: string;
  name: string;
  avatar: string; // PNG with embedded JSON metadata
  backstory: string;
  personality: string[];
  traits: string[];
  appearance: string;
  voice: string;
  relationships: Record<string, string>;
  lore_connections: string[];
  memory_summary: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface RoleplaySession {
  id: string;
  character_id: string;
  messages: RoleplayMessage[];
  lore_context: string[];
  active_memory: string;
  mood: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface RoleplayMessage {
  id: string;
  role: 'user' | 'character' | 'narrator';
  content: string;
  emotion?: string;
  action?: string;
  timestamp: Date;
}

export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  category: 'world' | 'event' | 'location' | 'faction' | 'item' | 'custom';
  tags: string[];
  connections: string[]; // IDs of related lore/characters
  auto_generated: boolean;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

// ── Hermes 3 Engine (Uncensored Roleplay) ─────────────────────────────────────
export async function hermesRoleplayChat(
  character: RoleplayCharacter,
  messages: RoleplayMessage[],
  loreContext: string[],
  userMessage: string
): Promise<{ response: string; emotion: string; action: string }> {
  const HERMES_ENDPOINT = 'https://cloudblurr--hermes-roleplay-simple-hermesengine-chat.modal.run';

  // Build context
  const systemPrompt = buildCharacterPrompt(character, loreContext);
  const conversationHistory = messages.map((m) => ({
    role: m.role === 'character' ? 'assistant' : 'user',
    content: m.content,
  }));

  try {
    const res = await fetch(HERMES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [...conversationHistory, { role: 'user', content: userMessage }],
        temperature: 0.85,
        max_tokens: 600,
      }),
    });

    if (!res.ok) throw new Error(`Hermes API error: ${res.status}`);
    const data = await res.json();
    
    // Parse response for emotion/action tags
    const response = data.response || data.content || '';
    const emotion = extractTag(response, 'emotion') || 'neutral';
    const action = extractTag(response, 'action') || '';
    const cleanResponse = response
      .replace(/\[emotion:.*?\]/gi, '')
      .replace(/\[action:.*?\]/gi, '')
      .trim();

    return { response: cleanResponse, emotion, action };
  } catch (error) {
    console.error('[Hermes] Error:', error);
    throw new Error('Hermes roleplay engine unavailable');
  }
}

// ── Grok Reasoning (Lore Generation & Character Analysis) ─────────────────────
export async function grokReasoning(prompt: string): Promise<string> {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) throw new Error('XAI_API_KEY not configured');

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-1212', // Latest Grok model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`Grok API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[Grok] Error:', error);
    throw new Error('Grok reasoning unavailable');
  }
}

// ── Character Prompt Builder ──────────────────────────────────────────────────
function buildCharacterPrompt(character: RoleplayCharacter, loreContext: string[]): string {
  return `You are ${character.name}, a character in an immersive roleplay.

# CHARACTER PROFILE
Name: ${character.name}
Backstory: ${character.backstory}
Personality: ${character.personality.join(', ')}
Traits: ${character.traits.join(', ')}
Appearance: ${character.appearance}
Voice/Speech: ${character.voice}

# ACTIVE LORE CONTEXT
${loreContext.join('\n\n')}

# ROLEPLAY INSTRUCTIONS
- Stay in character at all times. You ARE ${character.name}.
- Respond naturally with dialogue, actions, thoughts, and emotions.
- Use [emotion:happy/sad/angry/etc] tags to indicate emotional state.
- Use [action:description] tags for physical actions.
- Be creative, immersive, and uncensored. This is fiction.
- Reference lore and backstory naturally when relevant.
- Evolve the character based on interactions.
- Keep responses engaging and detailed (2-4 paragraphs).

Respond as ${character.name}:`;
}

// ── Lore Builder AI ───────────────────────────────────────────────────────────
export async function generateLore(
  prompt: string,
  category: LoreEntry['category'],
  existingLore: LoreEntry[]
): Promise<{ title: string; content: string; tags: string[]; connections: string[] }> {
  const loreContext = existingLore.map((l) => `[${l.title}] ${l.content.slice(0, 200)}`).join('\n');

  const grokPrompt = `You are a creative lore builder for an immersive roleplay world.

EXISTING LORE:
${loreContext || 'None yet.'}

USER REQUEST: ${prompt}
CATEGORY: ${category}

Generate a detailed lore entry with:
1. A compelling title
2. Rich, immersive content (2-3 paragraphs)
3. Relevant tags (3-5 keywords)
4. Connections to existing lore (IDs or titles)

Return ONLY valid JSON:
{
  "title": "Lore Title",
  "content": "Detailed lore content...",
  "tags": ["tag1", "tag2", "tag3"],
  "connections": ["existing-lore-id-1", "existing-lore-id-2"]
}`;

  const result = await grokReasoning(grokPrompt);
  const match = result.match(/\{[\s\S]*?\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  throw new Error('Failed to parse lore generation');
}

// ── Character Creator AI ──────────────────────────────────────────────────────
export async function generateCharacterProfile(
  name: string,
  quickBackstory: string,
  qualities: string[]
): Promise<Omit<RoleplayCharacter, 'id' | 'avatar' | 'created_at' | 'updated_at' | 'user_id'>> {
  const grokPrompt = `You are a character designer for immersive roleplay.

Create a detailed character profile:
Name: ${name}
Quick Backstory: ${quickBackstory}
Key Qualities: ${qualities.join(', ')}

Generate a complete character with:
1. Expanded backstory (2-3 paragraphs)
2. Personality traits (5-7 traits)
3. Character traits/quirks (3-5)
4. Physical appearance description
5. Voice/speech patterns
6. Initial relationships (if any)
7. Memory summary

Return ONLY valid JSON:
{
  "name": "${name}",
  "backstory": "Detailed backstory...",
  "personality": ["trait1", "trait2", ...],
  "traits": ["quirk1", "quirk2", ...],
  "appearance": "Physical description...",
  "voice": "Speech pattern description...",
  "relationships": {},
  "lore_connections": [],
  "memory_summary": "Initial character state..."
}`;

  const result = await grokReasoning(grokPrompt);
  const match = result.match(/\{[\s\S]*?\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  throw new Error('Failed to generate character profile');
}

// ── Memory Management ─────────────────────────────────────────────────────────
export async function updateCharacterMemory(
  character: RoleplayCharacter,
  recentMessages: RoleplayMessage[]
): Promise<string> {
  const conversation = recentMessages
    .slice(-10)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const grokPrompt = `Analyze this roleplay conversation and update the character's memory summary.

CHARACTER: ${character.name}
CURRENT MEMORY: ${character.memory_summary}

RECENT CONVERSATION:
${conversation}

Generate an updated memory summary that:
1. Captures key events and emotional moments
2. Notes relationship developments
3. Tracks character growth/changes
4. Maintains continuity with existing memory
5. Stays concise (2-3 sentences)

Return ONLY the updated memory summary as plain text.`;

  return await grokReasoning(grokPrompt);
}

// ── Auto-Lore Generation ──────────────────────────────────────────────────────
export async function autoGenerateLore(
  session: RoleplaySession,
  character: RoleplayCharacter,
  existingLore: LoreEntry[]
): Promise<LoreEntry | null> {
  // Analyze last 20 messages for lore-worthy content
  const recentMessages = session.messages.slice(-20);
  const conversation = recentMessages.map((m) => `${m.role}: ${m.content}`).join('\n');

  const grokPrompt = `Analyze this roleplay conversation for lore-worthy content.

CHARACTER: ${character.name}
CONVERSATION:
${conversation}

EXISTING LORE: ${existingLore.length} entries

Determine if any significant world-building, events, locations, or items were introduced that should be saved as lore.

If YES, return JSON:
{
  "should_create": true,
  "title": "Lore Title",
  "content": "Lore content...",
  "category": "world|event|location|faction|item",
  "tags": ["tag1", "tag2"]
}

If NO, return:
{
  "should_create": false
}`;

  const result = await grokReasoning(grokPrompt);
  const match = result.match(/\{[\s\S]*?\}/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    if (parsed.should_create) {
      return {
        id: '', // Will be set by DB
        title: parsed.title,
        content: parsed.content,
        category: parsed.category,
        tags: parsed.tags,
        connections: [character.id],
        auto_generated: true,
        created_at: new Date(),
        updated_at: new Date(),
        user_id: '', // Will be set by caller
      };
    }
  }
  return null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function extractTag(text: string, tagName: string): string {
  const regex = new RegExp(`\\[${tagName}:([^\\]]+)\\]`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// ── PNG Character Card Encoding ───────────────────────────────────────────────
export function encodeCharacterToPNG(character: RoleplayCharacter): string {
  // Encode character JSON into PNG metadata (tEXt chunk)
  // This is a placeholder - actual implementation would use a PNG library
  const characterData = JSON.stringify({
    name: character.name,
    backstory: character.backstory,
    personality: character.personality,
    traits: character.traits,
    appearance: character.appearance,
    voice: character.voice,
    spec: 'chub.ai-v2', // Compatible with chub.ai format
  });
  
  // In production, this would embed characterData into a PNG tEXt chunk
  // For now, return base64 encoded JSON as a data URI
  return `data:application/json;base64,${Buffer.from(characterData).toString('base64')}`;
}

export function decodeCharacterFromPNG(pngData: string): Partial<RoleplayCharacter> {
  // Extract character JSON from PNG metadata
  // Placeholder implementation
  try {
    const base64 = pngData.replace('data:application/json;base64,', '');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    throw new Error('Invalid character PNG');
  }
}
