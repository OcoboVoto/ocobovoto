/*
  Warnings:

  - You are about to drop the column `celular` on the `propietarios` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `propietarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "propietarios" DROP COLUMN "celular",
DROP COLUMN "email";

-- AlterTable
ALTER TABLE "proposiciones" ALTER COLUMN "descripcion" DROP NOT NULL;
