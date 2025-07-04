-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_drinks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "caffeine_mg" DECIMAL NOT NULL,
    "size_ml" DECIMAL NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drinks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_drinks" ("caffeine_mg", "created_at", "created_by_user_id", "id", "name", "size_ml", "updated_at") SELECT "caffeine_mg", "created_at", "created_by_user_id", "id", "name", "size_ml", "updated_at" FROM "drinks";
DROP TABLE "drinks";
ALTER TABLE "new_drinks" RENAME TO "drinks";
CREATE UNIQUE INDEX "drinks_name_created_by_user_id_key" ON "drinks"("name", "created_by_user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
