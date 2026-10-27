# ORCA TASK: Integracion de Turso y Formulario Extendido de Waitlist

## 1. Contexto y Nuevos Requerimientos
Evolucionar la Waitlist de AstroAm (dApp en Solana con backend Node.js 22 Express y frontend React Vite):
1. **Persistencia en la Nube con Turso (LibSQL):** Reemplazar la persistencia efimera de Render por conexion permanente a Turso (SQLite serverless gratuito) usando `@libsql/client`, manteniendo compatibilidad con fallback local de `node:sqlite`.
2. **Ampliacion de Datos del Formulario:**
   - Nombre completo (obligatorio)
   - Celular / Telefono (obligatorio)
   - Email (obligatorio, unico)
   - De donde es / Pais de origen (obligatorio)
   - Proximo viaje (opcional)
3. **Exportacion de CSV y CLI actualizados:** Incluir todos los nuevos campos en el archivo exportable.
4. **Diseno UI Cosmico:** Formulario responsive y estetico integrado en `FinalCTA.tsx` sin romper la armonia del satelite y los anillos orbitales.

## 2. Roles y Agentes
- **Orquestador:** `Antigravity` (Supervision arquitectonica, validacion de esquemas, ejecucion de pruebas y control de calidad).
- **Programador:** `OpenCode` (Ejecucion tecnica fullstack dividida en subagentes especializados).

---

## 3. Especificaciones Tecnicas (Contrato de Diseno)

### Backend & Persistencia:
1. Instalar la dependencia `@libsql/client` en el backend.
2. Actualizar `src/product/persistence/WaitlistRepository.ts`:
   - Si existen las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`, conectarse a Turso mediante `createClient` de `@libsql/client`.
   - Si no estan presentes (modo local/offline), utilizar `node:sqlite` (`./data/waitlist.db`) o `:memory:` para tests.
   - Tabla `waitlist` con columnas:
     - `id` (TEXT PRIMARY KEY)
     - `full_name` (TEXT NOT NULL)
     - `phone` (TEXT NOT NULL)
     - `email` (TEXT UNIQUE NOT NULL)
     - `country_origin` (TEXT NOT NULL)
     - `next_destination` (TEXT)
     - `created_at` (TEXT NOT NULL)
     - `source` (TEXT)
3. Actualizar `src/product/schemas/waitlist.ts`:
   - Validar con Zod:
     - `fullName`: string minimo 2, maximo 100 caracteres.
     - `phone`: string minimo 6, maximo 30 caracteres.
     - `email`: string email valido y normalizado a minusculas.
     - `countryOrigin`: string minimo 2, maximo 100 caracteres.
     - `nextDestination`: string opcional, maximo 100 caracteres.
     - `honeypot`: string opcional anti-bots.
4. Endpoints y Exportacion:
   - `POST /api/waitlist`: Recibe los nuevos campos. Idempotencia basada en email. Honeypot silencioso.
   - `GET /api/waitlist/export` y `scripts/export-waitlist.ts`: Generar CSV con encabezado:
     `id,full_name,phone,email,country_origin,next_destination,created_at,source`

### Frontend UI/UX:
1. Actualizar `frontend/src/api/waitlist.ts` con la nueva interfaz de datos.
2. Redisenar el formulario en `frontend/src/components/FinalCTA.tsx`:
   - Diseno en cuadricula limpia/responsive (1 columna en movil, 2 columnas en desktop para los campos secundarios).
   - Campos:
     - Nombre completo
     - Celular / WhatsApp
     - Email
     - Pais o Ciudad de origen (De donde eres)
     - Proximo viaje (opcional)
     - Campo honeypot oculto (`aria-hidden='true'`, `tabIndex={-1}`)
   - Inputs estilizados con bordes semitransparentes, foco violeta (`primaryviolet`), tipografia acorde y placeholders amigables.
   - Boton `JOIN BETA WAITLIST ->` estilizado con efecto glow.
   - Estados de carga, exito con mensaje personalizado y banner de error.

---

## 4. Plan de Ejecucion por Subagentes

### Subagente 1: OpenCode - Backend & Turso
1. Instalar `@libsql/client`.
2. Actualizar repositorio para soportar Turso con fallback a SQLite local.
3. Actualizar esquemas Zod en `src/product/schemas/waitlist.ts`.
4. Actualizar rutas en `src/product/api/routes.ts` y script de exportacion `scripts/export-waitlist.ts`.
5. Actualizar y ampliar la suite de pruebas en `src/product/waitlist.test.ts` (asegurar 100% de tests pasando con `npm test`).

### Subagente 2: OpenCode - Frontend Formulario Extendido
1. Actualizar tipos y cliente API en `frontend/src/api/waitlist.ts`.
2. Actualizar `frontend/src/components/FinalCTA.tsx` con los nuevos campos respetando el diseno del satelite y anillos.
3. Asegurar responsive design impecable (probado para mobile y desktop).
4. Validar que `npm --prefix frontend run typecheck` y `npm --prefix frontend run build` completen con 0 errores.

### Subagente 3: Antigravity - Orquestador, QA & Git
1. Ejecutar tests backend y frontend: `npm test` y `npm --prefix frontend run build`.
2. Verificar manualmente registro con los nuevos campos e idempotencia.
3. Gestion de Git:
   - Crear rama `feat/turso-waitlist-extended`.
   - Commitear todos los cambios con mensaje descriptivo.
   - Hacer `git push -u origin feat/turso-waitlist-extended`.
   - No mergear a main (el usuario se encargara de revisar y mergear).
4. Reportar resumen final con las variables necesarias para configurar en Render (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`).

---

## 5. Instrucciones de Inicio
Usando las skills de orca, `Antigravity`, toma el control como Orquestador, presenta el plan de trabajo a los subagentes `OpenCode` y comienza ordenando la ejecucion del Subagente 1 (Backend & Turso).
