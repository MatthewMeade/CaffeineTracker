/*
  Warnings:

  - A unique constraint covering the columns `[name,created_by_user_id]` on the table `drinks` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "drinks_name_created_by_user_id_key" ON "drinks"("name", "created_by_user_id");
