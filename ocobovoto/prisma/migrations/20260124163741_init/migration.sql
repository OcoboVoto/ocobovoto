-- CreateTable
CREATE TABLE "conjuntos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "coeficiente_total" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propietarios" (
    "id" TEXT NOT NULL,
    "conjunto_id" TEXT NOT NULL,
    "torre_manzana" TEXT NOT NULL,
    "apto_casa" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "celular" TEXT,
    "email" TEXT,
    "coeficiente" DECIMAL(10,4) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propietarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_admin" (
    "id" TEXT NOT NULL,
    "conjunto_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asambleas" (
    "id" TEXT NOT NULL,
    "conjunto_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "modalidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "quorum_requerido" DECIMAL(5,2) NOT NULL,
    "quorum_inicial" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quorum_final" DECIMAL(5,2),
    "confirmacion_activada" BOOLEAN NOT NULL DEFAULT false,
    "qr_code_data" TEXT NOT NULL,
    "orden_dia" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asambleas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_asamblea" (
    "id" TEXT NOT NULL,
    "asamblea_id" TEXT NOT NULL,
    "propietario_id" TEXT NOT NULL,
    "cedula_registrante" TEXT NOT NULL,
    "hora_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modalidad_asistencia" TEXT NOT NULL,
    "poderes_representados" JSONB,

    CONSTRAINT "registros_asamblea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poderes" (
    "id" TEXT NOT NULL,
    "propietario_otorgante_id" TEXT NOT NULL,
    "asamblea_id" TEXT NOT NULL,
    "cedula_apoderado" TEXT NOT NULL,
    "nombre_apoderado" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "poderes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votantes" (
    "id" TEXT NOT NULL,
    "asamblea_id" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "coeficiente_total" DECIMAL(10,4) NOT NULL,
    "propietarios_representa" INTEGER NOT NULL,
    "detalle_representados" JSONB NOT NULL,
    "confirmo_asistencia" BOOLEAN NOT NULL DEFAULT false,
    "hora_confirmacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposiciones" (
    "id" TEXT NOT NULL,
    "asamblea_id" TEXT NOT NULL,
    "numero_orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo_pregunta" TEXT NOT NULL,
    "tipo_mayoria" TEXT NOT NULL,
    "porcentaje_requerido" DECIMAL(5,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "inicio_votacion" TIMESTAMP(3),
    "fin_votacion" TIMESTAMP(3),

    CONSTRAINT "proposiciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones_respuesta" (
    "id" TEXT NOT NULL,
    "proposicion_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "opciones_respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos" (
    "id" TEXT NOT NULL,
    "proposicion_id" TEXT NOT NULL,
    "votante_id" TEXT NOT NULL,
    "opcion_id" TEXT NOT NULL,
    "coeficiente_aplicado" DECIMAL(10,4) NOT NULL,
    "propietarios_representados" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmaciones_asistencia" (
    "id" TEXT NOT NULL,
    "asamblea_id" TEXT NOT NULL,
    "votante_id" TEXT NOT NULL,
    "hora_confirmacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ubicacion" TEXT,

    CONSTRAINT "confirmaciones_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conjuntos_nit_key" ON "conjuntos"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "propietarios_cedula_key" ON "propietarios"("cedula");

-- CreateIndex
CREATE INDEX "propietarios_conjunto_id_idx" ON "propietarios"("conjunto_id");

-- CreateIndex
CREATE INDEX "propietarios_cedula_idx" ON "propietarios"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "propietarios_conjunto_id_torre_manzana_apto_casa_key" ON "propietarios"("conjunto_id", "torre_manzana", "apto_casa");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_admin_conjunto_id_key" ON "usuarios_admin"("conjunto_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_admin_email_key" ON "usuarios_admin"("email");

-- CreateIndex
CREATE INDEX "asambleas_conjunto_id_idx" ON "asambleas"("conjunto_id");

-- CreateIndex
CREATE INDEX "asambleas_estado_idx" ON "asambleas"("estado");

-- CreateIndex
CREATE INDEX "registros_asamblea_asamblea_id_idx" ON "registros_asamblea"("asamblea_id");

-- CreateIndex
CREATE UNIQUE INDEX "registros_asamblea_asamblea_id_cedula_registrante_key" ON "registros_asamblea"("asamblea_id", "cedula_registrante");

-- CreateIndex
CREATE INDEX "poderes_asamblea_id_idx" ON "poderes"("asamblea_id");

-- CreateIndex
CREATE UNIQUE INDEX "poderes_propietario_otorgante_id_asamblea_id_key" ON "poderes"("propietario_otorgante_id", "asamblea_id");

-- CreateIndex
CREATE INDEX "votantes_asamblea_id_idx" ON "votantes"("asamblea_id");

-- CreateIndex
CREATE UNIQUE INDEX "votantes_asamblea_id_cedula_key" ON "votantes"("asamblea_id", "cedula");

-- CreateIndex
CREATE INDEX "proposiciones_asamblea_id_idx" ON "proposiciones"("asamblea_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposiciones_asamblea_id_numero_orden_key" ON "proposiciones"("asamblea_id", "numero_orden");

-- CreateIndex
CREATE INDEX "opciones_respuesta_proposicion_id_idx" ON "opciones_respuesta"("proposicion_id");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_respuesta_proposicion_id_codigo_key" ON "opciones_respuesta"("proposicion_id", "codigo");

-- CreateIndex
CREATE INDEX "votos_proposicion_id_idx" ON "votos"("proposicion_id");

-- CreateIndex
CREATE INDEX "votos_votante_id_idx" ON "votos"("votante_id");

-- CreateIndex
CREATE UNIQUE INDEX "votos_proposicion_id_votante_id_key" ON "votos"("proposicion_id", "votante_id");

-- CreateIndex
CREATE INDEX "confirmaciones_asistencia_asamblea_id_idx" ON "confirmaciones_asistencia"("asamblea_id");

-- CreateIndex
CREATE UNIQUE INDEX "confirmaciones_asistencia_asamblea_id_votante_id_key" ON "confirmaciones_asistencia"("asamblea_id", "votante_id");

-- AddForeignKey
ALTER TABLE "propietarios" ADD CONSTRAINT "propietarios_conjunto_id_fkey" FOREIGN KEY ("conjunto_id") REFERENCES "conjuntos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_admin" ADD CONSTRAINT "usuarios_admin_conjunto_id_fkey" FOREIGN KEY ("conjunto_id") REFERENCES "conjuntos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asambleas" ADD CONSTRAINT "asambleas_conjunto_id_fkey" FOREIGN KEY ("conjunto_id") REFERENCES "conjuntos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_asamblea" ADD CONSTRAINT "registros_asamblea_asamblea_id_fkey" FOREIGN KEY ("asamblea_id") REFERENCES "asambleas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_asamblea" ADD CONSTRAINT "registros_asamblea_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poderes" ADD CONSTRAINT "poderes_propietario_otorgante_id_fkey" FOREIGN KEY ("propietario_otorgante_id") REFERENCES "propietarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poderes" ADD CONSTRAINT "poderes_asamblea_id_fkey" FOREIGN KEY ("asamblea_id") REFERENCES "asambleas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votantes" ADD CONSTRAINT "votantes_asamblea_id_fkey" FOREIGN KEY ("asamblea_id") REFERENCES "asambleas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposiciones" ADD CONSTRAINT "proposiciones_asamblea_id_fkey" FOREIGN KEY ("asamblea_id") REFERENCES "asambleas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_respuesta" ADD CONSTRAINT "opciones_respuesta_proposicion_id_fkey" FOREIGN KEY ("proposicion_id") REFERENCES "proposiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_proposicion_id_fkey" FOREIGN KEY ("proposicion_id") REFERENCES "proposiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_votante_id_fkey" FOREIGN KEY ("votante_id") REFERENCES "votantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones_respuesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_asistencia" ADD CONSTRAINT "confirmaciones_asistencia_asamblea_id_fkey" FOREIGN KEY ("asamblea_id") REFERENCES "asambleas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_asistencia" ADD CONSTRAINT "confirmaciones_asistencia_votante_id_fkey" FOREIGN KEY ("votante_id") REFERENCES "votantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
