# ORCA TASK: Implementacion de Waitlist de AstroAm

## 1. Contexto y Objetivo
Implementar un sistema integral de lista de espera (Waitlist) en el proyecto AstroAm (astroam-solana). La aplicacion es una dApp de eSIM sobre Solana con backend en Node.js 22 (Express) y frontend en React (Vite + Tailwind CSS).

## 2. Roles y Agentes
- **Orquestador:** Antigravity (Supervision de arquitectura, validacion de dependencias, revision de codigo y testing E2E).
- **Programador:** OpenCode (Ejecucion tecnica dividida en subagentes especializados).

---

## 3. Especificaciones Tecnicas Acordadas (Contrato de Diseno)
1. **Persistencia Backend:**
   - Usar el modulo nativo de Node.js 22: node:sqlite (DatabaseSync), sin paquetes npm binarios adicionales.
   - Base de datos local en ./data/waitlist.db.
   - Tabla waitlist con: id (TEXT/UUID), email (TEXT UNIQUE), created_at (TEXT ISO8601), source (TEXT).
2. **Endpoints API Express (/api/waitlist):**
   - POST /api/waitlist: Recibe { email, honeypot? }.
     - Si honeypot contiene datos, descartar silenciosamente (anti-bot).
     - Validacion con zod de formato email.
     - Manejo idempotente: Si el email ya existe, responder HTTP 200 con { status: 'ok', alreadyRegistered: true, message: 'Ya estas a bordo!' }.
   - GET /api/waitlist/export: Protegido por cabecera Authorization: Bearer <WAITLIST_ADMIN_SECRET> o query param ?secret=... Descarga el contenido en formato CSV (Content-Type: text/csv).
   - GET /api/waitlist/count: Retorna { count: number }.
3. **Script CLI:**
   - Script scripts/export-waitlist.ts ejecutable con npm run waitlist:export.
4. **Frontend y UX:**
   - **Header (frontend/src/components/Header.tsx):** Mantener START MISSION como boton principal; agregar boton secundario JOIN WAITLIST con scroll suave hacia el ancla #waitlist.
   - **FinalCTA (frontend/src/components/FinalCTA.tsx):**
     - Anadir id='waitlist'.
     - Integrar formulario cosmico inline (input para email, campo honeypot oculto, boton submit con glow y animaciones acordes a la estetica de AstroAm).
     - Estados visuales: reposo, cargando (spinner/glow), y exito persistente (mensaje cosmico de bienvenida a la beta privada).
     - Respetar los colores y clases Tailwind existentes (primaryviolet, tealbrand, cardborder, etc.).

---

## 4. Plan de Ejecucion por Subagentes

### Subagente 1: OpenCode - Backend y Persistencia
**Tareas:**
1. Crear src/product/persistence/WaitlistRepository.ts utilizando node:sqlite. Asegurar creacion automatica de la tabla e indices si no existen.
2. Crear src/product/schemas/waitlist.ts con esquemas Zod de validacion.
3. Registrar las rutas en el router de la app (src/product/api/routes.ts o modulo dedicado).
4. Implementar scripts/export-waitlist.ts y anadir el script 'waitlist:export' en package.json.
5. Crear pruebas unitarias e integracion en src/product/waitlist.test.ts.

### Subagente 2: OpenCode - Frontend UI/UX
**Tareas:**
1. Crear cliente API en frontend/src/api/waitlist.ts para comunicarse con POST /api/waitlist.
2. Modificar frontend/src/components/Header.tsx:
   - Anadir boton secundario JOIN WAITLIST con efecto hover y smooth scroll hacia #waitlist.
   - Mantener el boton START MISSION intacto.
3. Modificar frontend/src/components/FinalCTA.tsx:
   - Anadir el formulario de registro con la estetica espacial de AstroAm.
   - Manejar estados: validacion de email, honeypot oculto (aria-hidden='true'), spinner de carga, y vista de confirmacion positiva.
4. Asegurar diseno 100% responsivo (movil y desktop).

### Subagente 3: Antigravity - Orquestador, QA y Entrega en Git
**Tareas:**
1. Revisar los diffs generados por OpenCode para asegurar consistencia con el stack y sin romper la configuracion existente.
2. Ejecutar suite de pruebas backend: npm test.
3. Validar tipado y compilacion del frontend: npm --prefix frontend run typecheck y npm --prefix frontend run build.
4. Verificar manualmente:
   - Registro de email nuevo -> exito.
   - Registro de email duplicado -> respuesta amigable idempotente.
   - Activacion de honeypot -> bloqueo silencioso de spam.
   - Exportacion de CSV mediante npm run waitlist:export.
5. **Gestion de Git y Publicacion de Rama:**
   - Crear una nueva rama dedicada (ejemplo: feat/waitlist-beta o feature/waitlist).
   - Anadir y commitear todos los cambios con un mensaje claro y descriptivo (ej: feat(waitlist): add sqlite waitlist system, export script, and landing cta).
   - Hacer git push -u origin <nombre-de-la-rama> para subirla al repositorio remoto.
   - No realizar merge a main: dejar la rama publicada en el remoto para que el usuario se encargue de la revision final y el merge.
6. Emitir reporte final de la mision con el resumen de cambios, nombre de la rama publicada e instrucciones de prueba.

---

## 5. Instrucciones de Inicio
Usando las skills de orca, Antigravity, toma el control como Orquestador, presenta el plan de trabajo a los subagentes OpenCode y comienza ordenando la ejecucion del Subagente 1 (Backend y Persistencia). Invoca a los subagentes dentro de orca.
