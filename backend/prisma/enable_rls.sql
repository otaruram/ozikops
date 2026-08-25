-- ENABLE RLS FOR ALL TABLES
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "badge_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "regulasi_knowledge_base" ENABLE ROW LEVEL SECURITY;

-- 1. USERS: Only users can see and edit their own user record
CREATE POLICY "Users can view their own data" 
ON "users" FOR SELECT 
USING ("id" = auth.uid()::text);

CREATE POLICY "Users can update their own data" 
ON "users" FOR UPDATE 
USING ("id" = auth.uid()::text);

-- 2. PROJECT AUDITS: Users can only see and insert their own audits
CREATE POLICY "Users can view their own audits" 
ON "project_audits" FOR SELECT 
USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can insert their own audits" 
ON "project_audits" FOR INSERT 
WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can update their own audits" 
ON "project_audits" FOR UPDATE 
USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can delete their own audits" 
ON "project_audits" FOR DELETE 
USING ("userId" = auth.uid()::text);

-- 3. AUDIT ISSUES: Users can view issues linked to their audits
CREATE POLICY "Users can view their audit issues" 
ON "audit_issues" FOR SELECT 
USING (
  "auditId" IN (
    SELECT id FROM "project_audits" WHERE "userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert audit issues" 
ON "audit_issues" FOR INSERT 
WITH CHECK (
  "auditId" IN (
    SELECT id FROM "project_audits" WHERE "userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete audit issues" 
ON "audit_issues" FOR DELETE 
USING (
  "auditId" IN (
    SELECT id FROM "project_audits" WHERE "userId" = auth.uid()::text
  )
);

-- 4. BADGE VERIFICATIONS: Public can view badges (for verification page)
CREATE POLICY "Anyone can view badge verifications" 
ON "badge_verifications" FOR SELECT 
USING (true);

-- 5. REGULASI KNOWLEDGE BASE: Public can view knowledge base
CREATE POLICY "Anyone can view regulasi" 
ON "regulasi_knowledge_base" FOR SELECT 
USING (true);
