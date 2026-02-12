-- CreateIndex
CREATE INDEX "asambleas_conjunto_id_estado_idx" ON "asambleas"("conjunto_id", "estado");

-- CreateIndex
CREATE INDEX "propietarios_conjunto_id_activo_idx" ON "propietarios"("conjunto_id", "activo");

-- CreateIndex
CREATE INDEX "registros_asamblea_cedula_registrante_idx" ON "registros_asamblea"("cedula_registrante");

-- CreateIndex
CREATE INDEX "votos_proposicion_id_opcion_id_idx" ON "votos"("proposicion_id", "opcion_id");
