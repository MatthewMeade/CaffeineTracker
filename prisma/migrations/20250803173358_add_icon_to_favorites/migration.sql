-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '☕',
    "caffeine_mg" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_favorites" ("caffeine_mg", "createdAt", "id", "name", "userId") SELECT "caffeine_mg", "createdAt", "id", "name", "userId" FROM "user_favorites";
DROP TABLE "user_favorites";
ALTER TABLE "new_user_favorites" RENAME TO "user_favorites";
CREATE UNIQUE INDEX "user_favorites_userId_name_caffeine_mg_key" ON "user_favorites"("userId", "name", "caffeine_mg");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
