/**
 * lib/llmClient.ts
 * LLM client wrapping the DigitalOcean GPT OSS 120B OpenAI-compatible endpoint.
 * Reads DO_INFERENCE_URL and DO_INFERENCE_API_KEY from environment.
 */

// ── Error type ────────────────────────────────────────────────────────────────

export class LlmError extends Error {
  statusCode: number;
  body: string;

  constructor(statusCode: number, body: string) {
    super(`LLM request failed with status ${statusCode}: ${body}`);
    this.name = 'LlmError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

// ── Core fetch helper with timeout and streaming support ────────────────────

async function callLlm(messages: { role: string; content: string }[], timeoutMs: number = 60000): Promise<string> {
  const baseUrl = process.env.DO_INFERENCE_URL;
  const apiKey = process.env.DO_INFERENCE_API_KEY;

  if (!baseUrl) throw new Error('DO_INFERENCE_URL is not set');
  if (!apiKey) throw new Error('DO_INFERENCE_API_KEY is not set');

  // DigitalOcean AI uses /api/v1/chat/completions (not /v1/chat/completions)
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      throw new LlmError(res.status, body);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new LlmError(408, 'Request timeout');
    }
    throw err;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a task instruction against the LLM with optional context.
 * Returns the model's text response.
 */
export async function runTaskInstruction(
  instruction: string,
  context?: string
): Promise<string> {
  const messages = [
    {
      role: 'system',
      content:
        'You are a helpful AI assistant executing a specific task. Use the provided context and follow the instruction precisely.',
    },
    ...(context
      ? [{ role: 'user', content: `Context:\n${context}` }]
      : []),
    { role: 'user', content: instruction },
  ];

  return callLlm(messages);
}

/**
 * Fetch a URL and return its text content.
 */
export async function webFetch(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}
