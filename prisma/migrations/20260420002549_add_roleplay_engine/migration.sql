-- CreateTable
CREATE TABLE "roleplay_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "traits" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "relationships" TEXT NOT NULL DEFAULT '{}',
    "lore_connections" TEXT NOT NULL DEFAULT '[]',
    "memory_summary" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "roleplay_characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roleplay_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "character_id" TEXT NOT NULL,
    "lore_context" TEXT NOT NULL DEFAULT '[]',
    "active_memory" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT 'neutral',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "roleplay_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "roleplay_sessions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "roleplay_characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roleplay_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "emotion" TEXT,
    "action" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roleplay_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "roleplay_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lore_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "connections" TEXT NOT NULL DEFAULT '[]',
    "auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "lore_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "roleplay_characters_user_id_idx" ON "roleplay_characters"("user_id");

-- CreateIndex
CREATE INDEX "roleplay_sessions_user_id_idx" ON "roleplay_sessions"("user_id");

-- CreateIndex
CREATE INDEX "roleplay_sessions_character_id_idx" ON "roleplay_sessions"("character_id");

-- CreateIndex
CREATE INDEX "roleplay_messages_session_id_idx" ON "roleplay_messages"("session_id");

-- CreateIndex
CREATE INDEX "lore_entries_user_id_idx" ON "lore_entries"("user_id");

-- CreateIndex
CREATE INDEX "lore_entries_category_idx" ON "lore_entries"("category");
