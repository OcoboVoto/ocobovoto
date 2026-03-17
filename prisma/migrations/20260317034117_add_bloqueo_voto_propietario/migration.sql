-- AlterTable
ALTER TABLE "propietarios" ADD COLUMN     "bloqueado_para_votar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivo_bloqueo" TEXT;
