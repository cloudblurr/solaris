/**
 * lib/skyway.ts
 * Sky-Way agent CRUD — all ops scoped to the authenticated user.
 * Max 5 agents per user.
 */

import { prisma } from './prisma';

export interface SkywayAgentData {
  id: string;
  name: string;
  description: string | null;
  personality: string | null;
  instructions: string | null;
  knowledge_base: string[];   // parsed from JSON
  skills: string[];           // parsed from JSON
  icon: string;
  color: string;
  temperature: number;
  is_active: boolean;
  source: string;
  source_item_id: string | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

function mapAgent(a: any): SkywayAgentData {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    personality: a.personality,
    instructions: a.instructions,
    knowledge_base: a.knowledge_base ? JSON.parse(a.knowledge_base) : [],
    skills: a.skills ? JSON.parse(a.skills) : [],
    icon: a.icon,
    color: a.color,
    temperature: a.temperature,
    is_active: a.is_active,
    source: a.source,
    source_item_id: a.source_item_id,
    created_at: a.created_at,
    updated_at: a.updated_at,
    user_id: a.user_id,
  };
}

export async function getUserAgents(userId: string): Promise<SkywayAgentData[]> {
  const agents = await prisma.skywayAgent.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'asc' },
  });
  return agents.map(mapAgent);
}

export async function getActiveAgent(userId: string): Promise<SkywayAgentData | null> {
  const agent = await prisma.skywayAgent.findFirst({
    where: { user_id: userId, is_active: true },
  });
  return agent ? mapAgent(agent) : null;
}

export async function createAgent(
  userId: string,
  data: {
    name: string;
    description?: string;
    personality?: string;
    instructions?: string;
    knowledge_base?: string[];
    skills?: string[];
    icon?: string;
    color?: string;
    temperature?: number;
    source?: string;
    source_item_id?: string;
  }
): Promise<SkywayAgentData> {
  // Enforce 5-agent limit
  const count = await prisma.skywayAgent.count({ where: { user_id: userId } });
  if (count >= 5) {
    throw new Error('Sky-Way limit reached. You can have at most 5 agents.');
  }

  const agent = await prisma.skywayAgent.create({
    data: {
      user_id: userId,
      name: data.name,
      description: data.description,
      personality: data.personality,
      instructions: data.instructions,
      knowledge_base: data.knowledge_base ? JSON.stringify(data.knowledge_base) : null,
      skills: data.skills ? JSON.stringify(data.skills) : null,
      icon: data.icon ?? '🤖',
      color: data.color ?? '#facc15',
      temperature: data.temperature ?? 0.7,
      source: data.source ?? 'custom',
      source_item_id: data.source_item_id,
    },
  });
  return mapAgent(agent);
}

export async function updateAgent(
  userId: string,
  agentId: string,
  data: Partial<{
    name: string;
    description: string;
    personality: string;
    instructions: string;
    knowledge_base: string[];
    skills: string[];
    icon: string;
    color: string;
    temperature: number;
    is_active: boolean;
  }>
): Promise<SkywayAgentData> {
  const updateData: any = { ...data };
  if (data.knowledge_base !== undefined) {
    updateData.knowledge_base = JSON.stringify(data.knowledge_base);
  }
  if (data.skills !== undefined) {
    updateData.skills = JSON.stringify(data.skills);
  }

  // If activating this agent, deactivate all others first
  if (data.is_active === true) {
    await prisma.skywayAgent.updateMany({
      where: { user_id: userId },
      data: { is_active: false },
    });
  }

  const agent = await prisma.skywayAgent.updateMany({
    where: { id: agentId, user_id: userId },
    data: updateData,
  });

  const updated = await prisma.skywayAgent.findFirst({
    where: { id: agentId, user_id: userId },
  });
  if (!updated) throw new Error('Agent not found');
  return mapAgent(updated);
}

export async function deleteAgent(userId: string, agentId: string): Promise<void> {
  await prisma.skywayAgent.deleteMany({
    where: { id: agentId, user_id: userId },
  });
}

export async function setActiveAgent(userId: string, agentId: string): Promise<void> {
  // Deactivate all
  await prisma.skywayAgent.updateMany({
    where: { user_id: userId },
    data: { is_active: false },
  });
  // Activate selected
  await prisma.skywayAgent.updateMany({
    where: { id: agentId, user_id: userId },
    data: { is_active: true },
  });
  // Persist in settings
  await prisma.userSettings.upsert({
    where: { user_id: userId },
    update: { active_agent_id: agentId },
    create: { user_id: userId, active_agent_id: agentId },
  });
}
