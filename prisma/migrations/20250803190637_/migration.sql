-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_caffeine_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "consumed_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "caffeine_mg" DECIMAL NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '☕',
    CONSTRAINT "caffeine_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_caffeine_entries" ("caffeine_mg", "consumed_at", "created_at", "id", "name", "user_id") SELECT "caffeine_mg", "consumed_at", "created_at", "id", "name", "user_id" FROM "caffeine_entries";
DROP TABLE "caffeine_entries";
ALTER TABLE "new_caffeine_entries" RENAME TO "caffeine_entries";
CREATE INDEX "caffeine_entries_user_id_consumed_at_idx" ON "caffeine_entries"("user_id", "consumed_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
