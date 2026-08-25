-- 1. Enable RLS pada semua tabel
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "badge_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_trouble_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plant_sops_and_pids" ENABLE ROW LEVEL SECURITY;

-- 2. Buat Policy: Mengizinkan semua aksi (CRUD) untuk user yang sudah login (Authenticated)
CREATE POLICY "Enable all for authenticated users" ON "users" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON "badge_verifications" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON "maintenance_trouble_tickets" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON "ticket_issues" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON "plant_sops_and_pids" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
