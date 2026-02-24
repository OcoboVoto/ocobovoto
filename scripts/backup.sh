#!/bin/bash
#Guardar backup de la base de datos
DATE=$(date +%F)
FILE="backup_$DATE.sql"

pg_dump "$DATABASE_URL" > $FILE

echo "Backup creado: $FILE"