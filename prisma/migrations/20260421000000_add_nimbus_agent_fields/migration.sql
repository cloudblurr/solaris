-- AlterTable: add new columns to nimbus_cloud_agents
ALTER TABLE "nimbus_cloud_agents" ADD COLUMN "temporal_workflow_id" TEXT;
ALTER TABLE "nimbus_cloud_agents" ADD COLUMN "tasks" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "nimbus_cloud_agents" ADD COLUMN "integrations" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "nimbus_cloud_agents" ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'manual';
