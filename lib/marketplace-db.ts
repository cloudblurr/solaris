/**
 * lib/marketplace-db.ts
 * Marketplace CRUD — public directory + user installs.
 */

import { prisma } from './prisma';
import { agentQuery } from './agent-query';

export interface MarketplaceEntryData {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  category: string;
  icon: string;
  author_id: string;
  author_name: string;
  version: string;
  config_schema: any | null;
  payload: any | null;
  tags: string[];
  screenshots: string[];
  status: string;
  review_notes: string | null;
  downloads: number;
  rating: number;        // computed avg
  rating_count: number;
  is_official: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapEntry(e: any): MarketplaceEntryData {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    long_description: e.long_description,
    category: e.category,
    icon: e.icon,
    author_id: e.author_id,
    author_name: e.author_name,
    version: e.version,
    config_schema: e.config_schema ? JSON.parse(e.config_schema) : null,
    payload: e.payload ? JSON.parse(e.payload) : null,
    tags: e.tags ? JSON.parse(e.tags) : [],
    screenshots: e.screenshots ? JSON.parse(e.screenshots) : [],
    status: e.status,
    review_notes: e.review_notes,
    downloads: e.downloads,
    rating: e.rating_count > 0 ? Math.round((e.rating_sum / e.rating_count) * 10) / 10 : 0,
    rating_count: e.rating_count,
    is_official: e.is_official,
    created_at: e.created_at,
    updated_at: e.updated_at,
  };
}

// ── Public listing ─────────────────────────────────────────────────────────────
export async function listMarketplace(opts?: {
  category?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceEntryData[]> {
  const where: any = {};
  if (opts?.category) where.category = opts.category;
  if (opts?.status) where.status = opts.status;
  else where.status = { in: ['approved', 'featured'] };
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search } },
      { description: { contains: opts.search } },
    ];
  }

  const entries = await prisma.marketplaceEntry.findMany({
    where,
    orderBy: [{ is_official: 'desc' }, { downloads: 'desc' }, { created_at: 'desc' }],
    take: opts?.limit ?? 100,
    skip: opts?.offset ?? 0,
  });
  return entries.map(mapEntry);
}

export async function getMarketplaceEntry(id: string): Promise<MarketplaceEntryData | null> {
  const entry = await prisma.marketplaceEntry.findUnique({ where: { id } });
  return entry ? mapEntry(entry) : null;
}

// ── Submission ─────────────────────────────────────────────────────────────────
export async function submitMarketplaceEntry(
  userId: string,
  authorName: string,
  data: {
    name: string;
    description: string;
    long_description?: string;
    category: string;
    icon?: string;
    payload?: any;
    config_schema?: any;
    tags?: string[];
    screenshots?: string[];
  }
): Promise<MarketplaceEntryData> {
  // AI review
  const reviewResult = await runAIReview(data.name, data.description, data.category, data.payload);

  const entry = await prisma.marketplaceEntry.create({
    data: {
      author_id: userId,
      author_name: authorName,
      name: data.name,
      description: data.description,
      long_description: data.long_description,
      category: data.category,
      icon: data.icon ?? '✨',
      payload: data.payload ? JSON.stringify(data.payload) : null,
      config_schema: data.config_schema ? JSON.stringify(data.config_schema) : null,
      tags: JSON.stringify(data.tags ?? []),
      screenshots: JSON.stringify(data.screenshots ?? []),
      status: reviewResult.approved ? 'approved' : 'pending',
      review_notes: reviewResult.notes,
    },
  });
  return mapEntry(entry);
}

// ── AI Review ─────────────────────────────────────────────────────────────────
async function runAIReview(
  name: string,
  description: string,
  category: string,
  payload: any
): Promise<{ approved: boolean; notes: string }> {
  try {
    const result = await agentQuery(
      `You are a marketplace content moderator for NimbusAI. Review the submitted item and decide if it should be auto-approved or held for manual review.
Auto-approve if: name is appropriate, description is clear and helpful, no harmful content, no spam.
Reject/hold if: inappropriate content, spam, malicious instructions, misleading description.
Return ONLY valid JSON: {"approved": true/false, "notes": "brief review note"}`,
      `Name: ${name}\nCategory: ${category}\nDescription: ${description}\nPayload preview: ${JSON.stringify(payload ?? {}).slice(0, 500)}`
    );
    const match = result.match(/\{[\s\S]*?\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // If AI review fails, hold for manual review
  }
  return { approved: false, notes: 'Pending manual review' };
}

// ── Install / Uninstall ────────────────────────────────────────────────────────
export async function installMarketplaceItem(
  userId: string,
  entryId: string,
  config?: any
): Promise<void> {
  await prisma.installedMarketplaceItem.upsert({
    where: { entry_id_user_id: { entry_id: entryId, user_id: userId } },
    update: { config: config ? JSON.stringify(config) : null },
    create: {
      entry_id: entryId,
      user_id: userId,
      config: config ? JSON.stringify(config) : null,
    },
  });
  // Increment download counter
  await prisma.marketplaceEntry.update({
    where: { id: entryId },
    data: { downloads: { increment: 1 } },
  });
}

export async function uninstallMarketplaceItem(userId: string, entryId: string): Promise<void> {
  await prisma.installedMarketplaceItem.deleteMany({
    where: { entry_id: entryId, user_id: userId },
  });
}

export async function getUserInstalledItems(userId: string): Promise<string[]> {
  const items = await prisma.installedMarketplaceItem.findMany({
    where: { user_id: userId },
    select: { entry_id: true },
  });
  return items.map((i: { entry_id: string }) => i.entry_id);
}

// ── Reviews ────────────────────────────────────────────────────────────────────
export async function submitReview(
  userId: string,
  entryId: string,
  rating: number,
  comment?: string
): Promise<void> {
  await prisma.marketplaceReview.upsert({
    where: { entry_id_reviewer_id: { entry_id: entryId, reviewer_id: userId } },
    update: { rating, comment },
    create: { entry_id: entryId, reviewer_id: userId, rating, comment },
  });
  // Recompute rating_sum and rating_count
  const reviews = await prisma.marketplaceReview.findMany({ where: { entry_id: entryId } });
  const sum = reviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
  await prisma.marketplaceEntry.update({
    where: { id: entryId },
    data: { rating_sum: sum, rating_count: reviews.length },
  });
}

export async function getEntryReviews(entryId: string) {
  return prisma.marketplaceReview.findMany({
    where: { entry_id: entryId },
    orderBy: { created_at: 'desc' },
    include: { reviewer: { select: { name: true, image: true } } },
  });
}

// ── Admin ──────────────────────────────────────────────────────────────────────
export async function adminUpdateStatus(
  entryId: string,
  status: 'approved' | 'rejected' | 'featured' | 'pending',
  notes?: string
): Promise<void> {
  await prisma.marketplaceEntry.update({
    where: { id: entryId },
    data: { status, review_notes: notes },
  });
}

// ── Seed official entries (run once) ──────────────────────────────────────────
export async function seedOfficialEntries(systemUserId: string): Promise<void> {
  const existing = await prisma.marketplaceEntry.count({ where: { is_official: true } });
  if (existing > 0) return; // Already seeded

  const officialEntries = [
    { name: 'Nimbus Core', description: 'General purpose AI assistant with deep reasoning', category: 'agents', icon: '☁️', tags: ['official', 'general', 'featured'] },
    { name: 'Nimbus Dev', description: 'Software development expert for coding, debugging, and architecture', category: 'agents', icon: '💻', tags: ['official', 'coding', 'featured'] },
    { name: 'Nimbus Research', description: 'Research & analysis agent for data synthesis and insights', category: 'agents', icon: '🔬', tags: ['official', 'research'] },
    { name: 'Nimbus Creative', description: 'Content creation, brainstorming, and creative writing', category: 'agents', icon: '🎨', tags: ['official', 'creative'] },
    { name: 'Nimbus Tutor', description: 'Patient learning companion with adaptive teaching', category: 'agents', icon: '📚', tags: ['official', 'education'] },
    { name: 'Scheduler Cloud', description: 'Automated task scheduling and reminder management', category: 'clouds', icon: '⏰', tags: ['official', 'automation'] },
    { name: 'Background Researcher', description: 'Continuous research on specified topics in the background', category: 'clouds', icon: '🔍', tags: ['official', 'research'] },
    { name: 'Code Runner', description: 'Execute and test code in multiple languages', category: 'apps', icon: '⚡', tags: ['official', 'coding', 'featured'] },
    { name: 'Mind Mapper', description: 'Create visual mind maps and flowcharts with AI', category: 'apps', icon: '🗺️', tags: ['official', 'productivity'] },
    { name: 'Translator', description: 'Multi-language translation with context awareness', category: 'addons', icon: '🌐', tags: ['official', 'language'] },
    { name: 'Summarizer', description: 'Quick intelligent content summarization', category: 'addons', icon: '📋', tags: ['official', 'productivity'] },
    { name: 'Code Review Prompt', description: 'Systematic code review template with best practices', category: 'prompts', icon: '📝', tags: ['official', 'coding'] },
    { name: 'Debug Assistant', description: 'Intelligent debugging and error resolution workflow', category: 'solutions', icon: '🐛', tags: ['official', 'coding'] },
    { name: 'Getting Started Guide', description: 'Complete guide for new NimbusAI users', category: 'guides', icon: '🚀', tags: ['official', 'beginner'] },
  ];

  for (const entry of officialEntries) {
    await prisma.marketplaceEntry.create({
      data: {
        author_id: systemUserId,
        author_name: 'NimbusAI',
        name: entry.name,
        description: entry.description,
        category: entry.category,
        icon: entry.icon,
        tags: JSON.stringify(entry.tags),
        status: entry.tags.includes('featured') ? 'featured' : 'approved',
        is_official: true,
        downloads: Math.floor(Math.random() * 10000) + 1000,
        rating_sum: Math.floor(Math.random() * 500) + 400,
        rating_count: Math.floor(Math.random() * 100) + 80,
      },
    });
  }
}
