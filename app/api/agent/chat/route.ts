/**
 * app/api/agent/chat/route.ts
 * Server-side proxy for DigitalOcean AI agent calls.
 * Keeps the API token out of the browser entirely.
 */

import { NextRequest, NextResponse } from 'next/server';

const AGENT_ENDPOINT = (process.env.DIGITAL_OCEAN_AI_ENDPOINT || 'https://fujduaaklpje5mkns7vwjpqw.agents.do-ai.run').replace(/\/$/, '');
// Use DO_INFERENCE_API_TOKEN — it's the working token for this endpoint
const API_TOKEN = process.env.DO_INFERENCE_API_TOKEN || process.env.DIGITAL_OCEAN_API_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const response = await fetch(`${AGENT_ENDPOINT}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ messages, stream }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`[Agent Chat] Upstream error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Agent API error ${response.status}`, detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Agent Chat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
