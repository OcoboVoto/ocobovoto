-- AlterTable
ALTER TABLE "asambleas" ADD COLUMN     "fecha_cierre_registros" TIMESTAMP(3),
ADD COLUMN     "quorum_al_cierre_registros" DECIMAL(5,2),
ADD COLUMN     "registros_cerrados" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "votantes" ADD COLUMN     "llegada_tarde" BOOLEAN NOT NULL DEFAULT false;
