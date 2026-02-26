-- DropForeignKey
ALTER TABLE "usuarios_admin" DROP CONSTRAINT "usuarios_admin_conjunto_id_fkey";

-- AlterTable
ALTER TABLE "conjuntos" ADD COLUMN     "admin_id" TEXT;

-- AddForeignKey
ALTER TABLE "conjuntos" ADD CONSTRAINT "conjuntos_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
