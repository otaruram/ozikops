-- Migration Script: OzikOps Pivot
-- Apply this via Supabase SQL Editor or psql to rename tables without losing data.

-- Rename core tables
ALTER TABLE IF EXISTS "environmental_laws" RENAME TO "plant_sops_and_pids";
ALTER TABLE IF EXISTS "regulasi_knowledge_base" RENAME TO "plant_sops_and_pids";
ALTER TABLE IF EXISTS "vendor_submissions" RENAME TO "maintenance_trouble_tickets";
ALTER TABLE IF EXISTS "project_audits" RENAME TO "maintenance_trouble_tickets";
ALTER TABLE IF EXISTS "audit_issues" RENAME TO "ticket_issues";

-- Rename specific domain columns (checking typical Prisma models)
ALTER TABLE "maintenance_trouble_tickets" RENAME COLUMN "projectName" TO "equipmentName";
ALTER TABLE "maintenance_trouble_tickets" RENAME COLUMN "feasibilityScore" TO "executionScore";

ALTER TABLE "ticket_issues" RENAME COLUMN "matchedLaw" TO "matchedSop";
ALTER TABLE "ticket_issues" RENAME COLUMN "originalLawText" TO "originalSopText";

-- Update enum or role logic if stored in DB
UPDATE "users" SET "role" = 'senior_engineer' WHERE "role" = 'auditor' OR "role" = 'CARBON EXPERT';
UPDATE "users" SET "role" = 'field_technician' WHERE "role" = 'vendor';

-- Create index for faster retrieval of SOPs
CREATE INDEX IF NOT EXISTS "idx_plant_sops_embedding" ON "plant_sops_and_pids" USING ivfflat (embedding vector_cosine_ops);
