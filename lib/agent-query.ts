// Shared helper for feature panels to call the DO Agent without a full chat thread
const AGENT_ENDPOINT =
  process.env.NEXT_PUBLIC_AGENT_ENDPOINT ||
  'https://fujduaaklpje5mkns7vwjpqw.agents.do-ai.run';
const ACCESS_KEY =
  process.env.NEXT_PUBLIC_AGENT_ACCESS_KEY ||
  'fIhPlDAAOiA_3VJMj_cg3QHN5lz5q0K_';

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

  const res = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages, stream: false }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Agent error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty agent response');
  return content;
}
