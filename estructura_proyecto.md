# OcoboVoto — Estructura y Funcionalidades del Proyecto

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL (Supabase) |
| ORM | Prisma |
| Estilos | Tailwind CSS + shadcn/ui |
| Realtime | Ably |
| Emails | React Email / Mailer |
| Deploy | Vercel |

---

## Estructura de Carpetas

```
ocobovoto/
├── app/                        # Next.js App Router
│   ├── admin/                  # Panel de administración (admin del conjunto)
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── asambleas/          # Gestión de asambleas
│   │   │   └── [id]/           # Detalle/edición de asamblea
│   │   ├── propietarios/       # Gestión de propietarios
│   │   └── reportes/           # Reportes y estadísticas
│   ├── api/                    # API Routes (backend)
│   │   ├── asambleas/          # CRUD asambleas
│   │   │   └── [id]/           # Operaciones por ID
│   │   ├── auth/               # Autenticación admin
│   │   ├── confirmacion/       # Confirmación de asistencia
│   │   ├── health/             # Health check
│   │   ├── poderes/            # Gestión de poderes notariales
│   │   │   └── [id]/           # Editar/eliminar poder por ID
│   │   ├── propietarios/       # Gestión de propietarios
│   │   │   ├── [id]/           # Operaciones por ID
│   │   │   ├── agregar/        # Agregar propietario individual
│   │   │   ├── buscar/         # Búsqueda por cédula o torre/apto
│   │   │   └── cargueMasivo/   # Carga masiva CSV
│   │   ├── proposiciones/      # CRUD proposiciones de votación
│   │   ├── registro/           # Registro de asistencia en asamblea
│   │   ├── super/              # APIs exclusivas del super admin
│   │   ├── votacion/           # Control de votación
│   │   │   └── [asambleaId]/   # Votación por asamblea
│   │   └── votos/              # Registro de votos
│   ├── login/                  # Login del admin del conjunto
│   ├── registro/               # Pantalla de registro de asistencia (tablet)
│   │   └── [asambleaId]/       # Registro en asamblea específica
│   ├── resultados-vivo/        # Resultados en tiempo real (proyector)
│   ├── super-admin/            # Panel super administrador
│   ├── super-login/            # Login super admin
│   └── votar/                  # Interfaz de votación para votantes
├── components/
│   ├── admin/                  # Componentes del panel admin
│   │   ├── BotonCerrarRegistro.tsx
│   │   ├── BotonConfirmarAsistencia.tsx
│   │   ├── ControlVotacion.tsx
│   │   ├── EditorPropietarios.tsx
│   │   ├── FormularioAsamblea.tsx
│   │   ├── FormularioPregunta.tsx
│   │   ├── GeneradorQR.tsx
│   │   ├── GestionPoderes.tsx       ← UI gestión de poderes
│   │   ├── ListaPropietarios.tsx
│   │   ├── ListaVotantes.tsx
│   │   └── QuorumDashboard.tsx
│   ├── hooks/                  # Custom hooks (useConfirmDialog, etc.)
│   ├── layouts/                # Layouts compartidos
│   ├── registro/               # Componentes de registro de asistencia
│   │   └── SelectorModalidadAsistencia.tsx
│   ├── resultados-vivo/        # Componentes de resultados en tiempo real
│   ├── super-admin/            # Componentes panel super admin
│   └── ui/                     # Componentes shadcn/ui (Button, Input, Table...)
├── lib/
│   ├── ably/                   # Configuración Ably (realtime)
│   ├── mailer/                 # Servicio de emails
│   ├── prisma.ts               # Cliente Prisma singleton
│   ├── reportes/               # Generación de reportes
│   ├── services/               # Servicios de negocio
│   ├── supabase/               # Cliente Supabase
│   ├── utils/                  # Utilidades varias
│   └── utils.ts                # Utils generales
├── prisma/
│   ├── schema.prisma           # Esquema de la BD
│   ├── seed.ts                 # Script de seed
│   └── migrations/             # Migraciones de BD
├── types/
│   └── index.ts                # Tipos TypeScript globales
├── emails/                     # Plantillas de email (React Email)
├── scripts/                    # Scripts auxiliares
└── public/                     # Assets estáticos
```

---

## Modelos de Base de Datos (Prisma)

### `Conjunto`
Representa un conjunto residencial.
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (UUID) | Identificador único |
| nombre | String | Nombre del conjunto |
| nit | String (unique) | NIT del conjunto |
| coeficienteTotal | Decimal | Suma total de coeficientes |
| adminId | String? | FK → UsuarioAdmin |

### `Propietario`
Un propietario puede tener **múltiples filas** (una por unidad: apto/casa).
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (UUID) | PK |
| conjuntoId | String | FK → Conjunto |
| torreManzana | String | Torre o manzana |
| aptoCasa | String | Número de apto o casa |
| nombreCompleto | String | Nombre del propietario |
| cedula | String | Cédula (puede repetirse si tiene varios aptos) |
| coeficiente | Decimal | Coeficiente de esa unidad |
| activo | Boolean | Si está activo |
| bloqueadoParaVotar | Boolean | Bloqueado para voto |

> **Clave única:** `(conjuntoId, torreManzana, aptoCasa)` — cada unidad es única, pero una misma cédula puede aparecer en varias filas.

### `Poder`
Poder notarial: un propietario delega su voto a otra persona.
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (UUID) | PK |
| propietarioOtorganteId | String | FK → Propietario (la fila específica de la unidad) |
| asambleaId | String | FK → Asamblea |
| cedulaApoderado | String | Cédula de quien recibe el poder |
| nombreApoderado | String | Nombre de quien recibe el poder |
| activo | Boolean | Si está activo |

> **Clave única:** `(propietarioOtorganteId, asambleaId)` — cada unidad solo puede otorgar un poder por asamblea.

### `Asamblea`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| estado | String | `borrador` / `activa` / `finalizada` |
| tipo | String | `ordinaria` / `extraordinaria` |
| modalidad | String | `presencial` / `virtual` / `hibrida` |
| quorumRequerido | Decimal | % mínimo requerido |
| registrosCerrados | Boolean | Si ya cerró el registro |

### `Votante`
Registro consolidado del participante en una asamblea.
| Campo | Tipo | Descripción |
|-------|------|-------------|
| cedula | String | Cédula del votante |
| coeficienteTotal | Decimal | Coeficiente propio + poderes |
| propietariosRepresenta | Int | Cuántos propietarios representa |
| detalleRepresentados | Json | Detalle de cada representado |

### Otros modelos
- **`RegistroAsamblea`**: registro físico de entrada a la asamblea.
- **`Proposicion`** + **`OpcionRespuesta`**: preguntas de votación con opciones.
- **`Voto`**: voto individual por proposición.
- **`ConfirmacionAsistencia`**: confirmación de presencia en sala.
- **`UsuarioAdmin`** / **`SuperAdmin`**: usuarios del sistema.

---

## Rutas API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/propietarios/buscar?cedula=&asambleaId=` | Busca propietario por cédula (o torre+apto). Devuelve coeficiente total con poderes. |
| POST | `/api/propietarios/agregar` | Agrega un propietario individual |
| POST | `/api/propietarios/cargueMasivo` | Carga masiva CSV de propietarios |
| PATCH/DELETE | `/api/propietarios/[id]` | Editar/eliminar propietario |
| POST | `/api/poderes` | Crear poder (actualmente: 1x1 por unidad) |
| GET | `/api/poderes?asambleaId=` | Listar poderes de una asamblea |
| PATCH/DELETE | `/api/poderes/[id]` | Editar/eliminar poder |
| POST | `/api/registro` | Registrar asistente en asamblea |
| GET/PATCH/DELETE | `/api/asambleas/[id]` | Gestión de asamblea |
| POST | `/api/votacion/[asambleaId]` | Registrar voto |
| GET | `/api/votos` | Consultar votos |
| POST | `/api/confirmacion` | Confirmar asistencia |
| GET | `/api/health` | Health check |

---

## Flujos Funcionales Principales

### 1. Ciclo de Vida de una Asamblea
```
borrador → activa → (registros_cerrados) → finalizada
```
1. El admin crea la asamblea (estado: `borrador`).
2. Activa la asamblea → se habilita el registro de asistentes.
3. Opcionalmente cierra el registro → se congela el quórum.
4. Finaliza la asamblea.

### 2. Registro de Asistencia (Tablet)
- Ruta: `/registro/[asambleaId]`
- El operador escanea QR o busca por cédula / torre+apto.
- Verifica si es propietario directo o apoderado (con poderes).
- Calcula coeficiente total (propio + poderes recibidos).
- Crea registro en `Votante` + `RegistroAsamblea`.

### 3. Gestión de Poderes
- El admin otorga un poder: ingresa cédula del otorgante + datos del apoderado.
- API valida: propietario existe, no tiene poder previo, no está ya registrado.
- Se crea un `Poder` vinculado a la fila específica de `Propietario` (por su `id`).
- Al registrar al apoderado en asamblea, su coeficiente incluye los poderes recibidos.

### 4. Votación
- El admin crea proposiciones con opciones de respuesta.
- Abre/cierra votaciones por proposición.
- Cada votante vota; el sistema multiplica votos por coeficiente.
- Los resultados se proyectan en tiempo real (`/resultados-vivo`).

### 5. Quórum
- Se calcula sumando coeficientes de todos los `Votante` registrados.
- Se compara contra `quorumRequerido` de la asamblea.
- Se actualiza en tiempo real vía Ably.

---

## Problema Conocido: Constructora con Múltiples Aptos

**Situación:** Una constructora (NIT/cédula única) figura como propietaria en múltiples unidades. La constructora delegó a personas diferentes para cada apto/grupo de aptos.

**Limitación actual (modo 1x1):** El formulario de poderes solo pide la cédula del otorgante → toma el primer `Propietario` encontrado con esa cédula → solo crea UN poder.

**Solución propuesta:** El formulario debe permitir seleccionar **cuál(es) unidad(es)** específica(s) de la constructora se están delegando, para poder asignar poderes diferentes a personas diferentes según la unidad. Ver análisis completo en el chat.

---

## Roles de Usuario

| Rol | Acceso | Ruta |
|-----|--------|------|
| Super Admin | Gestión de todos los conjuntos y admins | `/super-admin` |
| Admin Conjunto | Gestión de su conjunto, asambleas, propietarios, poderes | `/admin` |
| Operador Registro | Registro de asistencia en asamblea (tablet) | `/registro/[id]` |
| Votante | Votación activa | `/votar` |
| Público | Resultados en vivo | `/resultados-vivo` |
