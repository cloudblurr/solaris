// Shared helper for feature panels to call the DO Agent without a full chat thread.
// Routes through the server-side proxy so the API token never hits the browser.

export async function agentQuery(
  systemPrompt: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Agent error ${res.status}: ${err.detail || err.error || res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty agent response');
  return content;
}
