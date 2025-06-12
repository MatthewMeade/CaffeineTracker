/*
  Warnings:

  - You are about to drop the column `quantity` on the `caffeine_entries` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_caffeine_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "drink_id" TEXT NOT NULL,
    "consumed_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "caffeine_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "caffeine_entries_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_caffeine_entries" ("consumed_at", "created_at", "drink_id", "id", "user_id") SELECT "consumed_at", "created_at", "drink_id", "id", "user_id" FROM "caffeine_entries";
DROP TABLE "caffeine_entries";
ALTER TABLE "new_caffeine_entries" RENAME TO "caffeine_entries";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
