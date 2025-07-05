/*
  Warnings:

  - You are about to drop the `drinks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `drink_id` on the `caffeine_entries` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "drinks_name_created_by_user_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "drinks";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caffeine_mg" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "caffeine_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_caffeine_entries" ("caffeine_mg", "consumed_at", "created_at", "id", "name", "user_id") SELECT "caffeine_mg", "consumed_at", "created_at", "id", "name", "user_id" FROM "caffeine_entries";
DROP TABLE "caffeine_entries";
ALTER TABLE "new_caffeine_entries" RENAME TO "caffeine_entries";
CREATE INDEX "caffeine_entries_user_id_consumed_at_idx" ON "caffeine_entries"("user_id", "consumed_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_userId_name_caffeine_mg_key" ON "user_favorites"("userId", "name", "caffeine_mg");
