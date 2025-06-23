-- CreateIndex
CREATE INDEX "caffeine_entries_user_id_consumed_at_idx" ON "caffeine_entries"("user_id", "consumed_at");
