-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN "active_agent_id" TEXT;
ALTER TABLE "user_settings" ADD COLUMN "installed_addons" TEXT;

-- CreateTable
CREATE TABLE "skyway_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "personality" TEXT,
    "instructions" TEXT,
    "knowledge_base" TEXT,
    "skills" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🤖',
    "color" TEXT NOT NULL DEFAULT '#facc15',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "source_item_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "skyway_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nimbus_cloud_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "schedule" TEXT,
    "logs" TEXT NOT NULL DEFAULT '[]',
    "last_run" DATETIME,
    "next_run" DATETIME,
    "config" TEXT,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "source_item_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "nimbus_cloud_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marketplace_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "long_description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "config_schema" TEXT,
    "payload" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "screenshots" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "marketplace_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    CONSTRAINT "marketplace_reviews_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "marketplace_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "marketplace_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "installed_marketplace_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "config" TEXT,
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "installed_marketplace_items_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "marketplace_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "installed_marketplace_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "image" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "cloudreve_token" TEXT,
    "cloudreve_uid" TEXT,
    "provisioned" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_users" ("cloudreve_token", "cloudreve_uid", "created_at", "email", "id", "image", "name", "password_hash", "provisioned", "updated_at") SELECT "cloudreve_token", "cloudreve_uid", "created_at", "email", "id", "image", "name", "password_hash", "provisioned", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "skyway_agents_user_id_idx" ON "skyway_agents"("user_id");

-- CreateIndex
CREATE INDEX "nimbus_cloud_agents_user_id_idx" ON "nimbus_cloud_agents"("user_id");

-- CreateIndex
CREATE INDEX "marketplace_entries_author_id_idx" ON "marketplace_entries"("author_id");

-- CreateIndex
CREATE INDEX "marketplace_entries_category_idx" ON "marketplace_entries"("category");

-- CreateIndex
CREATE INDEX "marketplace_entries_status_idx" ON "marketplace_entries"("status");

-- CreateIndex
CREATE INDEX "marketplace_reviews_entry_id_idx" ON "marketplace_reviews"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_entry_id_reviewer_id_key" ON "marketplace_reviews"("entry_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "installed_marketplace_items_user_id_idx" ON "installed_marketplace_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "installed_marketplace_items_entry_id_user_id_key" ON "installed_marketplace_items"("entry_id", "user_id");
