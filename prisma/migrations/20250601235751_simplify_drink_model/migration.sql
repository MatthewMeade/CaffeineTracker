/*
  Warnings:

  - You are about to drop the column `caffeine_mg` on the `caffeine_entries` table. All the data in the column will be lost.
  - You are about to drop the column `base_size_ml` on the `drinks` table. All the data in the column will be lost.
  - You are about to drop the column `caffeine_mg_per_ml` on the `drinks` table. All the data in the column will be lost.
  - Made the column `drink_id` on table `caffeine_entries` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `caffeine_mg` to the `drinks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size_ml` to the `drinks` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_caffeine_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "drink_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "consumed_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "caffeine_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "caffeine_entries_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_caffeine_entries" ("consumed_at", "created_at", "drink_id", "id", "user_id") SELECT "consumed_at", "created_at", "drink_id", "id", "user_id" FROM "caffeine_entries";
DROP TABLE "caffeine_entries";
ALTER TABLE "new_caffeine_entries" RENAME TO "caffeine_entries";
CREATE TABLE "new_drinks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "caffeine_mg" DECIMAL NOT NULL,
    "size_ml" DECIMAL NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drinks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_drinks" ("created_at", "created_by_user_id", "id", "name", "updated_at") SELECT "created_at", "created_by_user_id", "id", "name", "updated_at" FROM "drinks";
DROP TABLE "drinks";
ALTER TABLE "new_drinks" RENAME TO "drinks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
