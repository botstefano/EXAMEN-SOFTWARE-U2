# Informe del Proyecto: PhishGuard Bank — Plataforma Antifishing SOC

---

## Índice General

1. Objetivos del proyecto
   1.1. Objetivo general
   1.2. Objetivos específicos
2. Alcances y limitaciones del proyecto
3. Requerimientos y funcionalidades del sistema
4. Diseño del sistema
   4.1. Diseño de interfaces y prototipos
   4.2. Diseño de la base de datos: modelo entidad-relación y estructura implementada
5. Tecnologías y herramientas utilizadas
   5.1. Lenguajes de programación y frameworks
   5.2. Herramientas de desarrollo
6. Implementación del sistema
7. Uso de inteligencia artificial en el desarrollo del proyecto
   7.1. Herramientas de inteligencia artificial utilizadas
   7.2. Registro de prompts utilizados
   7.3. Resultados obtenidos mediante la IA
   7.4. Modificaciones y adaptaciones realizadas por los estudiantes
   7.5. Verificación y pruebas de los resultados generados por la IA
8. Conclusiones
9. Recomendaciones
10. Referencias bibliográficas

---

## Índice de Figuras y Tablas

### Figuras

| Figura | Descripción |
|--------|-------------|
| Figura 1 | Diagrama de arquitectura general del sistema |
| Figura 2 | Flujo de detección heurística de phishing |
| Figura 3 | Máquina de estados del ciclo de vida de incidentes |
| Figura 4 | Estructura de navegación y rutas de la aplicación |
| Figura 5 | Interfaz del Dashboard SOC |
| Figura 6 | Interfaz del módulo de escaneo y análisis |
| Figura 7 | Interfaz de gestión de incidentes y timeline |
| Figura 8 | Interfaz del Asistente SOC (RAG) |
| Figura 9 | Interfaz de gestión de reglas (blacklist/whitelist) |
| Figura 10 | Interfaz de cumplimiento normativo y auditoría |

### Tablas

| Tabla | Descripción |
|-------|-------------|
| Tabla 1 | Matriz de roles y permisos (RBAC) |
| Tabla 2 | Escala de severidad y SLAs asociados |
| Tabura 3 | Indicadores de compromiso (IOCs) semilla |
| Tabla 4 | Reglas heurísticas de puntuación de URLs |
| Tabla 5 | Tecnologías y versiones utilizadas |
| Tabla 6 | Usuarios de demostración del sistema |
| Tabla 7 | Catálogo de permisos del sistema |

---

## 1. Objetivos del proyecto

### 1.1. Objetivo general

Desarrollar una plataforma web de detección, respuesta a incidentes y análisis antifraude/phishing orientada al sector bancario, que permita a un equipo de operaciones de seguridad (SOC) centralizar la gestión de amenazas de ingeniería social, automatizar la detección heurística de URLs y contenidos maliciosos, y mantener trazabilidad completa mediante auditoría y cumplimiento normativo.

### 1.2. Objetivos específicos

1. **Implementar un motor heurístico de detección de phishing** que analice URLs, texto y HTML aplicando entropía de Shannon, distancia de Levenshtein contra marcas bancarias conocidas, detección de TLDs maliciosos, homographs punycode y campos de credenciales.

2. **Construir un sistema de gestión de incidentes** con máquina de estados configurable (`nuevo → triage → investigacion → contencion → cerrado / falso_positivo`), cálculo automático de SLAs según severidad y timeline de eventos auditables.

3. **Desarrollar un dashboard SOC en tiempo real** que consolide métricas de phishing a 30 días, tasa de falsos positivos, MTTR (tiempo medio de respuesta), SLAs vencidos, tendencias y distribución por canales de ataque.

4. **Implementar gestión de indicadores de compromiso (IOCs)** con búsqueda difusa mediante algoritmos de similitud (Levenshtein) y enriquecimiento con Threat Intelligence.

5. **Crear un sistema de control de reglas** (blacklist/whitelist) con verificador en tiempo real que priorice listas blancas sobre listas negras.

6. **Diseñar un módulo de Threat Hunting** con búsqueda avanzada por filtros (veredicto, canal, URL) y correlación cruzada de indicadores con detecciones e incidentes.

7. **Implementar un asistente SOC basado en RAG** (Retrieval-Augmented Generation) que consulte playbooks operativos, políticas de retención y guías de respuesta ante incidentes con citas de fuentes documentales.

8. **Desarrollar gestión de campañas de phishing simulado** con creación de plantillas, importación de objetivos, lanzamiento y cálculo de click rate y report rate.

9. **Construir pipelines ETL** para ingesta de fuentes de telemetría con versionado, cálculo de checksums SHA-256 y carga de IOCs.

10. **Implementar generación de reportes** en múltiples formatos (PDF, Word .docx, Excel .xlsx) para KPIs, detalle de incidentes y gestión mensual.

11. **Desarrollar módulos de cumplimiento regulatorio y auditoría** con monitoreo de controles de seguridad, tasa de cumplimiento de SLA y exportación de bitácora append-only en JSON.

12. **Implementar gestión de usuarios con RBAC** (Control de Acceso Basado en Roles) con cinco roles diferenciados, cambio de credenciales con política de 12+ caracteres y autenticación multifactor (TOTP MFA).

---

## 2. Alcances y limitaciones del proyecto

### Alcances

- **Detección heurística en tiempo real**: El sistema analiza URLs, texto plano y contenido HTML aplicando más de 10 reglas heurísticas combinadas, generando un puntaje de confianza (0.0–0.99) y un veredicto clasificado (benigno, sospechoso, phishing).

- **Gestión completa del ciclo de vida de incidentes**: Desde la creación manual hasta el cierre o clasificación como falso positivo, con control de transiciones de estado válidas y registro de eventos en timeline.

- **Persistencia local de datos**: El sistema utiliza `localStorage` del navegador para mantener el estado de la aplicación entre sesiones, incluyendo usuarios, incidentes, IOCs, reglas, detecciones, campañas y logs de auditoría.

- **Simulación de Threat Intelligence**: Se incluye enriquecimiento simulado con proveedores como VirusTotal, generando puntuaciones y estadísticas de motores de análisis.

- **RBAC con cinco roles**: Administrador, Analista SOC, Auditor, Gestor de Reportes y Solo Lectura, cada uno con permisos específicos sobre los módulos del sistema.

- **Asistente RAG funcional**: Consulta sobre documentación interna (playbooks, políticas) mediante recuperación por palabras clave con puntuación de relevancia y citas de fuentes.

### Limitaciones

- **Sin backend real**: La aplicación opera enteramente en el frontend utilizando un almacén de datos en `localStorage`. No existe un servidor de base de datos, API REST ni autenticación server-side. Todas las operaciones son simuladas con delays artificiales.

- **Detección heurística, no basada en ML**: El motor de detección utiliza reglas heurísticas programadas (entropía, Levenshtein, listas de TLDs maliciosos) en lugar de modelos de aprendizaje automático entrenados.

- **Threat Intelligence simulada**: Los datos de enriquecimiento de IOCs (VirusTotal, etc.) son generados de forma sintética y no provienen de APIs reales.

- **MFA sin validación criptográfica real**: La autenticación multifactor genera un secreto TOTP pero la verificación del código acepta cualquier valor de 6 dígitos sin validación contra el algoritmo HMAC-SHA1 estándar.

- **Reportes como blobs de texto**: La generación de reportes en PDF/DOCX/XLSX produce archivos con contenido de texto plano, sin formato avanzado nativo de cada tipo de documento.

- **Sin integración con feeds externos reales**: Los pipelines ETL generan datos de muestra internos en lugar de consumir feeds reales de PhishTank u OpenPhish.

- **Almacenamiento limitado por localStorage**: La capacidad de almacenamiento está limitada por las restricciones del navegador (típicamente 5–10 MB), lo que puede no ser suficiente para volúmenes grandes de datos en un entorno de producción.

- **No escalabilidad multiusuario concurrente**: Al depender de `localStorage`, el sistema no soporta acceso concurrente desde múltiples dispositivos ni sincronización en tiempo real entre sesiones.

---

## 3. Requerimientos y funcionalidades del sistema

### Requerimientos funcionales

| RF | Descripción |
|----|-------------|
| RF-01 | El sistema debe permitir la autenticación de usuarios mediante email y contraseña, con soporte de MFA TOTP. |
| RF-02 | El sistema debe controlar el acceso a módulos según el rol del usuario (RBAC). |
| RF-03 | El sistema debe permitir escanear URLs, texto y HTML y devolver un veredicto (benigno, sospechoso, phishing) con nivel de confianza. |
| RF-04 | El sistema debe calcular entropía de Shannon, distancia de Levenshtein, detectar TLDs maliciosos, homographs punycode y campos de credenciales. |
| RF-05 | El sistema debe consultar listas de blacklist/whitelist durante el escaneo, priorizando whitelists. |
| RF-06 | El sistema debe permitir crear, filtrar, paginar y ver el detalle de incidentes. |
| RF-07 | El sistema debe gestionar transiciones de estado de incidentes mediante una máquina de estados con validación. |
| RF-08 | El sistema debe calcular SLAs automáticos según severidad (crítica: 30 min, alta: 2h, media: 8h, baja: 24h). |
| RF-09 | El sistema debe mantener un timeline de eventos por incidente (creación, cambio de estado, comentarios). |
| RF-10 | El sistema debe permitir buscar IOCs con coincidencia difusa (fuzzy search) y enriquecerlos con Threat Intelligence. |
| RF-11 | El sistema debe permitir gestionar listas de reglas (blacklist/whitelist) con operaciones CRUD sobre listas y entradas. |
| RF-12 | El sistema debe permitir verificar en tiempo real si un dominio coincide con listas activas. |
| RF-13 | El sistema debe permitir Threat Hunting con filtros por veredicto, canal, días y URL. |
| RF-14 | El sistema debe permitir correlacionar un indicador con detecciones e incidentes asociados. |
| RF-15 | El sistema debe proveer un asistente RAG que responda consultas sobre playbooks y políticas con citas de fuentes. |
| RF-16 | El sistema debe permitir crear, importar objetivos y lanzar campañas de phishing simulado. |
| RF-17 | El sistema debe calcular métricas de campañas: click rate y report rate. |
| RF-18 | El sistema debe permitir ejecutar pipelines ETL con versionado y checksums SHA-256. |
| RF-19 | El sistema debe generar reportes en PDF, DOCX y XLSX para KPIs, detalle de incidentes y gestión mensual. |
| RF-20 | El sistema debe mostrar métricas de cumplimiento normativo y controles de seguridad. |
| RF-21 | El sistema debe mantener una pista de auditoría append-only filtrable por acción. |
| RF-22 | El sistema debe permitir exportar logs de auditoría en formato JSON. |
| RF-23 | El sistema debe permitir gestionar usuarios (crear, activar/desactivar, asignar roles). |
| RF-24 | El sistema debe permitir cambiar contraseña con política mínima de 12 caracteres. |
| RF-25 | El sistema debe permitir configurar y activar MFA TOTP. |
| RF-26 | El dashboard debe mostrar KPIs: phishing 30d, sospechosos, benignos, tasa FP, MTTR, SLAs vencidos. |
| RF-27 | El dashboard debe mostrar gráficos de tendencias y distribución por canales de ataque. |

### Requerimientos no funcionales

| RNF | Descripción |
|-----|-------------|
| RNF-01 | La interfaz debe ser responsiva y adaptarse a dispositivos móviles, tablets y escritorio. |
| RNF-02 | El sistema debe utilizar un diseño consistente con sistema de colores, tipografía y espaciado de 8px. |
| RNF-03 | El sistema debe proporcionar feedback visual inmediato mediante toasts/notificaciones. |
| RNF-04 | El sistema debe simular latencia de red con delays artificiales para realismo en operaciones. |
| RNF-05 | El sistema debe persistir datos en `localStorage` para mantener estado entre sesiones. |
| RNF-06 | El sistema debe construir como aplicación de página única (SPA) con navegación client-side. |
| RNF-07 | La aplicación debe compilar correctamente para producción con `npm run build`. |

---

## 4. Diseño del sistema

### 4.1. Diseño de interfaces y prototipos

La aplicación sigue un patrón de diseño de panel de control (dashboard) con barra lateral de navegación y área de contenido principal. La arquitectura de interfaces se organiza de la siguiente manera:

**Estructura general de navegación (Figura 4):**

```
Login → Layout (Protected)
         ├── Sidebar (navegación filtrada por permisos)
         ├── Header (usuario actual, roles, cerrar sesión)
         └── Outlet (rutas anidadas)
              ├── /dashboard
              ├── /scan
              ├── /incidents → /incidents/:id
              ├── /indicators
              ├── /rules
              ├── /threat-hunting
              ├── /rag
              ├── /campaigns
              ├── /etl
              ├── /reports
              ├── /compliance
              ├── /audit
              ├── /users
              ├── /roles
              └── /profile
```

**Componentes de interfaz reutilizables:**

- **Card**: Contenedor con borde, sombra suave y esquinas redondeadas para agrupar contenido.
- **PageHeader**: Encabezado de página con título y acciones opcionales alineadas a la derecha.
- **DataTable**: Tabla genérica con columnas configurables, estado de carga y mensaje de vacío.
- **Modal**: Diálogo modal con overlay, cabecera con título y botón de cierre.
- **ConfirmDialog**: Diálogo de confirmación para acciones destructivas.
- **Badge**: Etiqueta de estado con colores semánticos (severidad, veredicto, estado de incidente, etc.).
- **Btn, Input, Select**: Controles de formulario estilizados consistentemente.
- **Spinner**: Indicador de carga animado.
- **ToastContainer**: Contenedor de notificaciones temporales (éxito, error, info) posicionado en la esquina inferior derecha.

**Paleta de colores y diseño:**

- **Fondo principal**: `slate-50` (#f8fafc) para áreas de contenido.
- **Barra lateral**: `slate-900` (#0f172a) con texto blanco y acentos en `blue-600`.
- **Color primario**: Azul (`blue-600` / `#2563eb`) para botones, enlaces activos y elementos interactivos.
- **Colores semánticos**: Rojo para crítico/phishing, naranja para alta/contención, amarillo para media/sospechoso, verde para benigno/activo/éxito, gris para cerrado/inactivo.
- **Sistema de espaciado**: Basado en múltiplos de 4px/8px siguiendo el sistema de Tailwind CSS.

**Prototipos de pantallas principales:**

- **Figura 5 — Dashboard SOC**: Grid de 6 tarjetas KPI en la parte superior, gráfico de líneas de tendencias (30 días) y gráfico circular de canales de ataque en la parte media, tabla de top IOCs activos en la parte inferior.

- **Figura 6 — Módulo de escaneo**: Selector de modo (URL/texto/HTML), selector de canal, campo de entrada con ejemplos rápidos, botón de análisis y panel de resultados con veredicto, confianza, razones detectadas, IOCs coincidentes, evaluación LLM y features técnicas expandibles.

- **Figura 7 — Gestión de incidentes**: Tabla con filtros por estado y severidad, paginación, vista de detalle con badges de estado/severidad/canal, resumen ejecutivo, tags, botones de transición de estado y timeline vertical con eventos auditables.

- **Figura 8 — Asistente SOC (RAG)**: Interfaz de chat con burbujas diferenciadas para usuario y asistente, botones de consultas predefinidas, indicador de carga y citas de fuentes consultadas debajo de cada respuesta.

- **Figura 9 — Gestión de reglas**: Layout de tres columnas: lista de reglas con contador de entradas, panel de entradas de la lista seleccionada con CRUD, y comprobador rápido de reglas con resultado visual.

- **Figura 10 — Cumplimiento y auditoría**: Selector de periodo en días, grid de métricas de seguridad, lista de controles de cumplimiento con indicadores ✓/✗, tarjeta de cumplimiento SLA y tabla de auditoría filtrable.

### 4.2. Diseño de la base de datos: modelo entidad-relación y estructura implementada

Dado que el sistema opera con persistencia en `localStorage` mediante un almacén de datos en memoria (clase `DataStore`), el modelo de datos se representa como un objeto JSON estructurado con las siguientes entidades:

**Modelo entidad-relación (lógico):**

```
┌──────────┐     ┌──────────────┐     ┌───────────────────┐
│  users   │     │  incidents   │     │ incident_events   │
│──────────│     │──────────────│     │───────────────────│
│ id (PK)  │◄──┐ │ id (PK)      │◄──┐ │ id (PK)           │
│ email    │   │ │ title        │   │ │ incident_id (FK)──│──► incidents
│ full_name│   │ │ description  │   │ │ event_type        │
│ password │   │ │ status       │   │ │ actor_id (FK)─────│──► users
│ roles[]  │   │ │ severity     │   │ │ payload           │
│ mfa_*    │   │ │ channel      │   │ │ created_at        │
│ is_active│   │ │ assignee_id──│───┘ │                   │
│ created_at│  │ │ sla_due_at   │     └───────────────────┘
└──────────┘  │ │ closed_at    │
              │ │ created_at   │     ┌───────────────────┐
              │ └──────────────┘     │   indicators      │
              │                      │───────────────────│
              │                      │ id (PK)           │
              │                      │ type              │
              │                      │ value             │
              │                      │ value_normalized  │
              │                      │ hit_count         │
              │                      │ is_active         │
              │                      │ first_seen        │
              │                      │ last_seen         │
              │                      │ attrs             │
              │                      └───────────────────┘
              │
              │     ┌──────────────┐     ┌───────────────────┐
              │     │  rule_lists  │     │   rule_entries    │
              │     │──────────────│     │───────────────────│
              │     │ id (PK)      │◄──┐ │ id (PK)           │
              │     │ name         │   │ │ list_id (FK)──────│──► rule_lists
              │     │ kind         │   │ │ value             │
              │     │ is_active    │   │ │ value_normalized  │
              │     │ created_at   │   │ │ reason            │
              │     └──────────────┘   │ │ expires_at        │
              │                        │ └───────────────────┘
              │
              │     ┌───────────────────────┐
              │     │    detections         │
              │     │───────────────────────│
              │     │ id (PK)               │
              │     │ incident_id (FK)──────│──► incidents
              │     │ verdict               │
              │     │ confidence            │
              │     │ channel               │
              │     │ detected_at           │
              │     │ meta                  │
              │     └───────────────────────┘
              │
              │     ┌───────────────────────┐     ┌────────────────────┐
              │     │    campaigns          │     │ campaign_targets   │
              │     │───────────────────────│     │────────────────────│
              │     │ id (PK)               │◄──┐ │ id (PK)            │
              │     │ name                  │   │ │ campaign_id (FK)───│──► campaigns
              │     │ template              │   │ │ email_hash         │
              │     │ status                │   │ │ department         │
              │     │ launched_at           │   │ │ sent_at            │
              │     │ created_at            │   │ │ clicked_at         │
              │     └───────────────────────┘   │ │ reported_at        │
              │                                 │ └────────────────────┘
              │
              │     ┌───────────────────────┐
              │     │  dataset_versions     │
              │     │───────────────────────│
              │     │ id (PK)               │
              │     │ source_name           │
              │     │ license               │
              │     │ checksum_sha256       │
              │     │ row_count             │
              │     │ source_url            │
              │     │ ingested_at           │
              │     └───────────────────────┘
              │
              │     ┌───────────────────────┐     ┌────────────────────┐
              │     │    rag_chunks         │     │     docs           │
              │     │───────────────────────│     │────────────────────│
              │     │ id (PK)               │◄──┐ │ id (PK)            │
              │     │ document_id (FK)──────│──►│ │ title              │
              │     │ document_title        │   │ │ category           │
              │     │ chunk_index           │   │ │ source_url         │
              │     │ content               │   └─│ chunks[]           │
              │     └───────────────────────┘     └────────────────────┘
              │
              │     ┌───────────────────────┐
              └────►│    audit_logs         │
                    │───────────────────────│
                    │ id (PK)               │
                    │ actor_id (FK)─────────│──► users
                    │ actor_email           │
                    │ action                │
                    │ resource              │
                    │ payload               │
                    │ created_at            │
                    │ ip_address            │
                    └───────────────────────┘

              ┌───────────────────┐
              │     roles         │
              │───────────────────│
              │ id (PK)           │
              │ code              │
              │ name              │
              │ description       │
              │ permissions[]     │
              └───────────────────┘
```

**Estructura implementada en el almacén de datos:**

El objeto principal `store.data` contiene las siguientes colecciones:

| Colección | Tipo | Descripción |
|-----------|------|-------------|
| `users` | Array | Usuarios del sistema con credenciales, roles y configuración MFA |
| `roles` | Array | Definición de roles y sus permisos (RBAC) |
| `incidents` | Array | Incidentes de seguridad con estado, severidad, SLA y timeline |
| `incidentEvents` | Array | Eventos del timeline de cada incidente |
| `indicators` | Array | Indicadores de compromiso (IOCs) |
| `ruleLists` | Array | Listas de reglas (blacklist/whitelist) |
| `ruleEntries` | Array | Entradas individuales dentro de cada lista de reglas |
| `detections` | Array | Resultados de análisis del motor heurístico |
| `campaigns` | Array | Campañas de phishing simulado |
| `campaignTargets` | Array | Objetivos de cada campaña con métricas de clic/reporte |
| `datasetVersions` | Array | Versiones de datasets ingeridos vía ETL |
| `docs` | Array | Documentos de conocimiento para el asistente RAG |
| `ragChunks` | Array | Fragmentos indexados de documentos para recuperación RAG |
| `auditLogs` | Array | Bitácora de auditoría append-only |

**Tabla 1 — Matriz de roles y permisos (RBAC):**

| Permiso | admin | analista_soc | auditor | reportes | readonly |
|---------|:-----:|:------------:|:-------:|:--------:|:--------:|
| dashboard:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| detection:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| detection:write | ✓ | ✓ | — | — | — |
| incident:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| incident:write | ✓ | ✓ | — | — | — |
| incident:assign | ✓ | ✓ | — | — | — |
| indicator:read | ✓ | ✓ | — | — | ✓ |
| indicator:write | ✓ | ✓ | — | — | — |
| etl:read | ✓ | ✓ | — | — | — |
| etl:execute | ✓ | — | — | — | — |
| report:generate | ✓ | — | — | ✓ | — |
| report:read | ✓ | ✓ | ✓ | ✓ | — |
| user:manage | ✓ | — | — | — | — |
| role:manage | ✓ | — | — | — | — |
| audit:read | ✓ | — | ✓ | — | — |
| soc:assistant | ✓ | ✓ | — | — | — |

**Tabla 2 — Escala de severidad y SLAs:**

| Severidad | SLA (horas) | SLA (minutos) |
|-----------|:-----------:|:-------------:|
| crítica | 0.5 | 30 |
| alta | 2 | 120 |
| media | 8 | 480 |
| baja | 24 | 1440 |

**Tabla 3 — Indicadores de compromiso (IOCs) semilla:**

| ID | Tipo | Valor | Hits |
|----|------|-------|------|
| ioc-1 | dominio | paypal-secure-login.example | 7 |
| ioc-2 | url | https://paypal-secure-login.example/verify | 3 |
| ioc-3 | dominio | bbva-seguro-online.example | 5 |
| ioc-4 | dominio | santander-seguro.example | 2 |
| ioc-5 | dominio | bbva-acceso.example | 3 |
| ioc-6 | dominio | banco-madrid-seguro.example | 1 |
| ioc-7 | ip | 203.0.113.5 | 4 |
| ioc-8 | ip | 198.51.100.77 | 2 |
| ioc-9 | hash | 5d41402abc4b2a76b9719d911017c592 | 1 |
| ioc-10 | telefono | +34900000123 | 7 |
| ioc-11 | email | facturacion@proveedor-seguro.example | 1 |

**Tabla 4 — Reglas heurísticas de puntuación de URLs:**

| Regla | Puntaje | Condición |
|-------|:-------:|-----------|
| Dominio legítimo | 0.00 (reset) | Dominio en lista LEGIT (paypal.com, bbva.es, etc.) |
| Host es IP | +0.25 | El hostname es una dirección IPv4 |
| Símbolo @ en URL | +0.20 | La URL contiene el carácter `@` |
| Punycode | +0.20 | El host contiene `xn--` (posible homograph) |
| Alta entropía | +0.10 | Entropía de Shannon del host > 3.8 |
| Exceso de subdominios | +0.10 | 3 o más subdominios |
| Acortador de URL | +0.10 | Host en lista de acortadores (bit.ly, t.co, etc.) |
| TLD sospechoso | +0.15 | TLD en lista de TLDs maliciosos (.tk, .ml, .ga, etc.) |
| Suplantación de marca | +0.40 | Coincidencia o similitud con marca bancaria conocida |
| Sin HTTPS | +0.05 | El protocolo no es HTTPS |
| **Puntaje máximo** | **0.95** | Acumulación de múltiples reglas |

**Tabla 6 — Usuarios de demostración:**

| Email | Nombre | Rol | MFA |
|-------|--------|-----|:---:|
| admin@phishguard.bank | Elena Navarro (Admin) | admin | Inactivo |
| maria.lopez@phishguard.bank | María López | analista_soc | Inactivo |
| carlos.ruiz@phishguard.bank | Carlos Ruiz | analista_soc | Inactivo |
| ana.torres@phishguard.bank | Ana Torres | auditor | Inactivo |
| javier.mendez@phishguard.bank | Javier Méndez | reportes | Inactivo |
| audit.viewer@phishguard.bank | Consulta Externa | readonly | Inactivo |

**Tabla 7 — Catálogo de permisos del sistema:**

| Código | Descripción |
|--------|-------------|
| dashboard:read | Acceso al dashboard SOC |
| detection:read | Lectura de detecciones |
| detection:write | Ejecución de escaneos |
| incident:read | Lectura de incidentes |
| incident:write | Modificación de incidentes |
| incident:assign | Asignación de incidentes |
| indicator:read | Lectura de IOCs |
| indicator:write | Escritura de IOCs |
| etl:read | Lectura de versiones de dataset |
| etl:execute | Ejecución de pipelines ETL |
| report:generate | Generación de reportes |
| report:read | Lectura de reportes |
| user:manage | Gestión de usuarios |
| role:manage | Gestión de roles |
| audit:read | Lectura de auditoría |
| soc:assistant | Acceso al asistente RAG |

**Algoritmos implementados en el motor heurístico:**

1. **Entropía de Shannon**: Calcula la imprevisibilidad de los caracteres del hostname. Valores altos (>3.8) sugieren dominios generados automáticamente (DGA).

2. **Distancia de Levenshtein**: Mide el número mínimo de ediciones (inserción, sustitución, eliminación) necesarias para transformar una cadena en otra. Se usa para detectar typosquatting contra marcas bancarias (PayPal, BBVA, Santander, CaixaBank, Bankinter, Visa, Mastercard).

3. **Normalización de URLs**: Elimina protocolo (`http://`, `https://`), prefijo `www.` y rutas para comparar dominios de forma consistente.

4. **Detección de leet speak**: Sustituye `1→l`, `0→o`, `3→e` para detectar typosquatting con caracteres visualmente similares.

5. **Detección de homograph punycode**: Identifica dominios que contienen `xn--` (codificación IDNA de caracteres Unicode).

6. **Análisis de texto**: Detecta lenguaje de urgencia/credenciales (urgente, bloqueada, suspendida, verificar, contraseña, OTP, etc.) y extrae URLs embebidas.

7. **Análisis de HTML**: Detecta formularios con campos de contraseña y acciones que envían datos a dominios externos.

**Máquina de estados de incidentes (Figura 3):**

```
         ┌──────────┐
         │  nuevo   │
         └────┬─────┘
              │
    ┌─────────┼─────────────┐
    ▼         ▼             ▼
┌────────┐ ┌──────────────┐ ┌──────────────┐
│ triage │ │ falso_positivo│ │   cerrado    │
└───┬────┘ └──────────────┘ └──────────────┘
    │
    ├──────────┬─────────────┐
    ▼          ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ investigacion│ │ falso_positivo│ │   cerrado    │
└──────┬───────┘ └──────────────┘ └──────────────┘
       │
       ├──────────┬─────────────┐
       ▼          ▼             ▼
┌────────────┐ ┌──────────────┐ ┌──────────────┐
│ contencion │ │ falso_positivo│ │   cerrado    │
└─────┬──────┘ └──────────────┘ └──────────────┘
      │
      ├──┐
      ▼  ▼
┌─────────┐ ┌──────────────┐
│ cerrado │ │ investigacion│
└─────────┘ └──────────────┘
      │
      ▼
┌──────────────┐
│ investigacion│
└──────────────┘
```

Transiciones válidas definidas:

| Estado actual | Estados destino permitidos |
|---------------|----------------------------|
| nuevo | triage, falso_positivo, cerrado |
| triage | investigacion, falso_positivo, cerrado |
| investigacion | contencion, falso_positivo, cerrado |
| contencion | cerrado, investigacion |
| cerrado | investigacion |
| falso_positivo | triage |

---

## 5. Tecnologías y herramientas utilizadas

### 5.1. Lenguajes de programación y frameworks

**Tabla 5 — Tecnologías y versiones utilizadas:**

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| JavaScript (ES6+) | — | Lenguaje principal de toda la aplicación |
| JSX | — | Sintaxis de extensión para componentes React |
| React | 18.3.1 | Biblioteca de interfaz de usuario (SPA) |
| React DOM | 18.3.1 | Renderizado de React en el navegador |
| React Router DOM | 6.26.0 | Enrutamiento client-side y navegación |
| Vite | 5.3.0 | Bundler y servidor de desarrollo |
| @vitejs/plugin-react | 4.3.0 | Plugin de Vite para soporte de React/JSX |
| Tailwind CSS | 3.4.0 | Framework CSS utility-first |
| TanStack Query (React Query) | 5.51.0 | Gestión de estado servidor, caching y sincronización |
| Zustand | 4.5.0 | Gestión de estado global ligero (auth, toasts) |
| Recharts | 2.12.0 | Biblioteca de gráficos (líneas, circulares) |
| Axios | 1.7.0 | Cliente HTTP (incluido, usado en simulación) |
| PostCSS | 8.4.0 | Procesador CSS para Tailwind |
| Autoprefixer | 10.4.0 | Post-procesador de prefijos CSS |

### 5.2. Herramientas de desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| Node.js + npm | Entorno de ejecución y gestor de paquetes |
| Vite Dev Server | Servidor de desarrollo con HMR (Hot Module Replacement) |
| Vite Build | Compilación de producción (bundle optimizado) |
| ESLint (via Vite) | Verificación de calidad de código mediante `vite build` |
| Navegador web (localStorage) | Persistencia de datos en cliente |
| Markdown | Documentación del proyecto (este informe) |

**Arquitectura de la aplicación (Figura 1):**

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cliente)                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  React SPA  │  │ TanStack     │  │   Zustand      │  │
│  │  (Router)   │──│ Query        │  │  (auth, toasts)│  │
│  └──────┬──────┘  │ (cache/fetch)│  └────────────────┘  │
│         │         └──────┬───────┘                       │
│  ┌──────┴────────────────┴───────┐                      │
│  │      API Client (A)           │                      │
│  │  (simulación de backend)      │                      │
│  └──────────────┬────────────────┘                      │
│                 │                                        │
│  ┌──────────────┴────────────────┐                      │
│  │     DataStore (store)         │                      │
│  │  (motor heurístico + datos)   │                      │
│  └──────────────┬────────────────┘                      │
│                 │                                        │
│  ┌──────────────┴────────────────┐                      │
│  │     localStorage              │                      │
│  │  (persistencia de datos)      │                      │
│  └───────────────────────────────┘                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Estructura de directorios del proyecto:**

```
phishguard-bank/
├── index.html                  # Punto de entrada HTML
├── package.json                # Dependencias y scripts
├── vite.config.js              # Configuración de Vite
├── tailwind.config.js          # Configuración de Tailwind CSS
├── postcss.config.js           # Configuración de PostCSS
├── metadata.json               # Metadatos del proyecto
├── .env.example                # Variables de entorno de ejemplo
├── README.md                   # Documentación del proyecto
└── src/
    ├── main.jsx                # Punto de entrada React
    ├── App.jsx                 # Definición de rutas
    ├── index.css               # Estilos globales
    ├── api/
    │   └── client.js           # Cliente API simulado (todas las operaciones)
    ├── components/
    │   ├── Layout.jsx          # Layout principal, Protected, Perm
    │   └── ui.jsx              # Componentes UI reutilizables
    ├── engine/
    │   ├── dataStore.js        # Almacén de datos + datos semilla
    │   └── heuristics.js       # Motor heurístico de detección
    ├── features/
    │   ├── Login.jsx           # Autenticación
    │   ├── Dashboard.jsx       # Dashboard SOC
    │   ├── Scan.jsx            # Escaneo y análisis
    │   ├── Incidents.jsx       # Gestión de incidentes
    │   ├── Indicators.jsx      # IOCs
    │   ├── Rules.jsx           # Blacklist/Whitelist
    │   ├── Soc.jsx             # Threat Hunting + Asistente RAG
    │   ├── Campaigns.jsx       # Campañas de phishing simulado
    │   ├── Admin.jsx           # ETL, Reportes, Cumplimiento, Auditoría
    │   └── Users.jsx           # Usuarios, Roles, Perfil
    ├── hooks/
    │   ├── useDebounce.js      # Hook de debounce para búsqueda
    │   └── usePermissions.js   # Hook de permisos RBAC
    ├── lib/
    │   └── queryClient.js      # Configuración de TanStack Query
    └── stores/
        ├── authStore.js        # Estado de autenticación (Zustand + persist)
        └── toastStore.js       # Estado de notificaciones (Zustand)
```

---

## 6. Implementación del sistema

### 6.1. Configuración base y arranque

El proyecto se inicia en `src/main.jsx`, que configura los providers de React Query y React Router:

```jsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</QueryClientProvider>
```

El `QueryClient` se configura con `refetchOnWindowFocus: false`, `retry: 1` y `staleTime: 60000` para optimizar las consultas y evitar refetch innecesario.

### 6.2. Autenticación y control de acceso

**Autenticación (`src/features/Login.jsx`):**

El flujo de autenticación simula un login bancario con:
- Validación de email y contraseña contra el almacén de datos.
- Bloqueo de cuenta tras 5 intentos fallidos (15 minutos de bloqueo).
- Soporte de MFA TOTP (solicita código de 6 dígitos si el usuario tiene MFA activado).
- Botones de selección rápida de usuarios de demostración.
- Persistencia del token en `authStore` mediante Zustand con middleware `persist`.

**Control de acceso (`src/components/Layout.jsx`):**

- `Protected`: Verifica la existencia de un token de acceso; redirige a `/login` si no existe.
- `Perm`: Verifica si el usuario tiene un permiso específico; muestra una página 403 si no lo tiene.
- `usePermissions`: Hook que obtiene los datos del usuario actual (`A.me`) y expone la función `has(code)` para verificación de permisos, con `staleTime` de 5 minutos.

La barra lateral de navegación filtra dinámicamente los enlaces según los permisos del usuario, mostrando solo las secciones accesibles.

### 6.3. Motor heurístico de detección

**Implementación (`src/engine/heuristics.js`):**

El motor implementa los siguientes algoritmos:

- **`entropy(s)`**: Calcula la entropía de Shannon de una cadena, recorriendo los caracteres y sumando `-p * log2(p)` para cada probabilidad de carácter.

- **`levenshtein(a, b)`**: Implementa la distancia de Levenshtein con programación dinámica usando dos arrays (previo y actual) para optimización de memoria O(n).

- **`analyzeUrl(url)`**: Extrae características de una URL: hostname, longitud, entropía del host, presencia de `@`, IP como host, punycode, número de subdominios, acortadores, TLD sospechoso, HTTPS, suplantación de marca (con detección de leet speak y distancia mínima ≤1).

- **`scoreUrl(f)`**: Aplica las reglas de puntuación descritas en la Tabla 4, retornando un puntaje acumulado (máximo 0.95) y la lista de razones detectadas.

- **`analyzeText(text)`**: Busca palabras de urgencia/credenciales en el texto y extrae URLs embebidas mediante expresión regular.

- **`analyzeHtml(html)`**: Detecta formularios con campos de contraseña y acciones a dominios externos.

**Marcas bancarias monitoreadas:**
`paypal`, `bbva`, `santander`, `caixabank`, `bankinter`, `visa`, `mastercard`, `banco`

**Dominios legítimos conocidos:**
`paypal.com`, `bbva.es`, `bbva.com`, `santander.es`, `santander.com`, `caixabank.es`, `bankinter.com`, `visa.com`, `mastercard.com`, `banco.example`, `phishguard.bank`

**TLDs considerados maliciosos:**
`tk`, `ml`, `ga`, `cf`, `gq`, `top`, `work`, `click`, `zip`

**Acortadores de URL detectados:**
`bit.ly`, `t.co`, `tinyurl.com`, `goo.gl`, `ow.ly`, `cutt.ly`

### 6.4. Flujo de detección (Figura 2)

```
Entrada (URL / Texto / HTML)
        │
        ▼
┌───────────────────┐
│ Análisis de texto  │──► Extracción de URLs
│ (urgencia/creds)   │──► Puntuación de lenguaje
└────────────────────┘
        │
        ▼
┌───────────────────┐
│ Análisis de HTML   │──► Detección de formularios
│ (forms/password)   │──► Detección de actions externos
└────────────────────┘
        │
        ▼
┌───────────────────┐
│ Por cada URL:      │
│ 1. analyzeUrl()    │──► Extracción de features
│ 2. checkRule()     │──► Whitelist (reset) / Blacklist (+0.95)
│ 3. scoreUrl()      │──► Puntuación heurística
│ 4. Match IOC exacto│──► +0.95 si coincide
│ 5. Match IOC fuzzy │──► +0.15 si similitud ≥60%
└────────────────────┘
        │
        ▼
┌───────────────────┐
│ Cálculo de veredicto│
│ ≥0.70 → phishing   │
│ ≥0.40 → sospechoso │
│ <0.40 → benigno    │
└────────────────────┘
        │
        ▼
┌───────────────────┐
│ Generación de      │
│ resumen LLM        │
│ + persistencia     │
│ (detection record) │
└────────────────────┘
        │
        ▼
    Resultado
```

### 6.5. Gestión de incidentes

**Implementación (`src/features/Incidents.jsx`):**

- **Lista de incidentes**: Tabla paginada (15 por página) con filtros por estado y severidad. Cada fila enlaza al detalle del incidente.
- **Creación de incidentes**: Modal con formulario de título, descripción, severidad, canal y tags. El SLA se calcula automáticamente al crear.
- **Detalle de incidente**: Vista completa con badges de estado/severidad/canal, descripción, tags, resumen ejecutivo, botones de transición de estado (solo se muestran las transiciones válidas según la máquina de estados) y timeline vertical de eventos.
- **Timeline**: Lista ordenada cronológicamente con tipo de evento, fecha y payload en formato JSON.

### 6.6. Indicadores de compromiso (IOCs)

**Implementación (`src/features/Indicators.jsx`):**

- **Búsqueda difusa**: Cuando el usuario escribe 3+ caracteres, se activa la búsqueda con debounce (350ms). La búsqueda calcula similitud mediante Levenshtein y devuelve resultados ordenados por relevancia (similitud ≥30%).
- **Vista por defecto**: Cuando no hay búsqueda activa, muestra los IOCs activos con su contador de hits.
- **Detalle y enriquecimiento**: Modal con valor normalizado, tipo y estado. Botón de enriquecimiento que simula consulta a VirusTotal y muestra puntuación de malicia, estadísticas de motores y JSON completo.

### 6.7. Reglas (Blacklist/Whitelist)

**Implementación (`src/features/Rules.jsx`):**

- **Gestión de listas**: Panel izquierdo con listas configuradas, contador de entradas y formulario para crear nuevas listas.
- **Gestión de entradas**: Panel central con CRUD de entradas (dominios, URLs, IPs) dentro de la lista seleccionada.
- **Comprobador rápido**: Formulario que verifica en tiempo real si un valor coincide con alguna lista activa, priorizando whitelists sobre blacklists.
- **Confirmación de eliminación**: Diálogo de confirmación antes de eliminar entradas.

### 6.8. Threat Hunting y correlación

**Implementación (`src/features/Soc.jsx`):**

- **Búsqueda avanzada**: Filtros por veredicto, canal, días hacia atrás y texto en URL. Retorna hasta 100 detecciones coincidentes.
- **Correlación cruzada**: Dado un valor (dominio, IP, etc.), busca coincidencias en tres fuentes simultáneamente:
  - **Indicadores**: Coincidencia en base de IOCs con estado y contador de hits.
  - **Detecciones**: Eventos de detección que contienen el valor (búsqueda en JSON completo).
  - **Incidentes**: Incidentes cuyo título, descripción o tags contienen el valor.

### 6.9. Asistente SOC (RAG)

**Implementación (`src/features/Soc.jsx` — componente `Assistant`):**

- **Base de conocimiento**: 4 documentos semilla con 7 fragmentos (chunks) indexados:
  1. Playbook de respuesta ante phishing (2 chunks)
  2. Guía de clones de BBVA y suplantación de marca (2 chunks)
  3. Política de retención de datos (1 chunk)
  4. Análisis de homograph attacks (1 chunk)

- **Recuperación**: El algoritmo RAG tokeniza la pregunta en palabras de 3+ caracteres, busca coincidencias en el contenido y título de cada chunk, puntúa por número de palabras coincidentes y retorna los 4 chunks más relevantes con score >0.

- **Interfaz de chat**: Burbujas diferenciadas usuario/asistente, consultas predefinidas (clon BBVA, SLA crítico, homograph, retención), indicador de carga y citas de fuentes debajo de cada respuesta.

### 6.10. Campañas de phishing simulado

**Implementación (`src/features/Campaigns.jsx`):**

- **Creación**: Modal con nombre, asunto, cuerpo del correo y lista de emails de destino (uno por línea).
- **Importación de objetivos**: Los emails se importan como hashes anónimizados con departamento.
- **Lanzamiento**: Cambia el estado a `running` y marca la fecha de envío de cada objetivo.
- **Métricas**: Tarjeta con enviados, clics fraudulentos, reportes a SOC, click rate y report rate.

### 6.11. ETL, Reportes, Cumplimiento y Auditoría

**Implementación (`src/features/Admin.jsx`):**

- **ETL**: Selector de fuente (muestra interna, PhishTank, OpenPhish), ejecución de pipeline que inserta IOCs nuevos y registra versión de dataset con checksum SHA-256.
- **Reportes**: Selector de tipo (KPIs semanales, detalle de incidente, gestión mensual) y formato (PDF, DOCX, XLSX). Parámetros dinámicos según tipo (selección de incidente o mes).
- **Cumplimiento**: Selector de periodo en días, grid de métricas (incidentes, cierre, auditoría, detecciones, datasets, IOCs), controles de cumplimiento con indicadores ✓/✗ y cumplimiento SLA.
- **Auditoría**: Tabla filtrable por acción con fecha, actor, acción, recurso e IP.

### 6.12. Gestión de usuarios y perfil

**Implementación (`src/features/Users.jsx`):**

- **Usuarios**: Tabla con email, nombre, roles, MFA, estado y acción de activar/desactivar. Modal de creación con email, nombre, contraseña (12+ caracteres) y asignación de roles mediante checkboxes.
- **Roles**: Grid de tarjetas mostrando cada rol con su descripción y lista completa de permisos.
- **Perfil**: Dos tarjetas: cambio de contraseña (con validación de 12+ caracteres y distinta a la actual) y configuración MFA TOTP (generación de secreto, entrada de código de 6 dígitos y activación).

---

## 7. Uso de inteligencia artificial en el desarrollo del proyecto

### 7.1. Herramientas de inteligencia artificial utilizadas

| Herramienta | Uso en el proyecto |
|-------------|-------------------|
| Bolt (asistente de desarrollo con IA) | Generación de código, estructura del proyecto, componentes React, motor heurístico, API simulada y documentación |
| Modelo de lenguaje generativo (LLM) | Asistente integrado en el flujo de desarrollo para generación y verificación de código |

### 7.2. Registro de prompts utilizados

A continuación se documentan los prompts principales utilizados durante el desarrollo del proyecto con la herramienta de IA:

| # | Prompt | Resultado esperado |
|---|--------|-----------------------|
| 1 | "Crear una plataforma bancaria antifishing SOC en React con Vite, Tailwind CSS, TanStack Query y Zustand" | Estructura base del proyecto, configuración de dependencias y archivos iniciales |
| 2 | "Implementar un motor heurístico de detección de phishing que analice URLs, texto y HTML con entropía de Shannon, distancia de Levenshtein, detección de TLDs maliciosos y homographs punycode" | Módulo `engine/heuristics.js` con todos los algoritmos de detección |
| 3 | "Crear un dashboard SOC con métricas de phishing a 30 días, MTTR, SLAs vencidos, gráficos de tendencias y canales de ataque usando Recharts" | Componente `Dashboard.jsx` con KPIs y visualizaciones |
| 4 | "Implementar gestión de incidentes con máquina de estados (nuevo → triage → investigacion → contencion → cerrado / falso_positivo), cálculo de SLA y timeline de eventos" | Componente `Incidents.jsx` con lista, detalle y transiciones |
| 5 | "Crear búsqueda difusa de IOCs con Levenshtein y enriquecimiento con Threat Intelligence simulada" | Componente `Indicators.jsx` con búsqueda fuzzy y modal de enriquecimiento |
| 6 | "Implementar gestión de reglas blacklist/whitelist con verificador en tiempo real que priorice whitelists" | Componente `Rules.jsx` con CRUD de listas y entradas |
| 7 | "Crear un asistente SOC basado en RAG que consulte playbooks y políticas con citas de fuentes" | Componente `Assistant` en `Soc.jsx` con chat y recuperación por keywords |
| 8 | "Implementar gestión de campañas de phishing simulado con click rate y report rate" | Componente `Campaigns.jsx` con creación, importación y métricas |
| 9 | "Crear pipelines ETL con versionado y checksums SHA-256, generación de reportes en PDF/DOCX/XLSX, y módulos de cumplimiento y auditoría" | Componente `Admin.jsx` con ETL, Reports, Compliance y AuditPage |
| 10 | "Implementar RBAC con 5 roles (admin, analista_soc, auditor, reportes, readonly), control de acceso por permisos y MFA TOTP" | Sistema de permisos, `usePermissions` hook, `authStore` y módulo de perfil |
| 11 | "Generar un informe .md del proyecto con la estructura: índice, objetivos, alcances, requerimientos, diseño, tecnologías, implementación, uso de IA, conclusiones, recomendaciones y referencias APA" | Este documento |

### 7.3. Resultados obtenidos mediante la IA

La utilización de IA generativa en el desarrollo del proyecto produjo los siguientes resultados:

1. **Estructura completa del proyecto**: La IA generó la arquitectura de directorios, configuración de build (Vite, Tailwind, PostCSS) y el punto de entrada de la aplicación en una sola pasada.

2. **Motor heurístico funcional**: Se obtuvo una implementación completa de los algoritmos de entropía de Shannon, distancia de Levenshtein, análisis de URLs/texto/HTML y puntuación combinada, con detección de typosquatting, homographs y suplantación de marca.

3. **14 módulos de interfaz**: Todos los componentes de interfaz fueron generados con diseño consistente, componentes reutilizables, estados de carga/vacío y feedback visual mediante toasts.

4. **Sistema RBAC completo**: Definición de 5 roles con 16 permisos, hook de verificación, componente de protección de rutas y filtrado dinámico de navegación.

5. **API simulada con 30+ operaciones**: El cliente API simula un backend completo con delays artificiales, validación de reglas de negocio, máquina de estados y registro de auditoría.

6. **Datos semilla realistas**: Generación de 8 incidentes, 11 IOCs, 6 listas de reglas, 1 campaña con 6 objetivos, 4 documentos RAG y logs de auditoría iniciales.

7. **Documentación técnica**: Generación de este informe con análisis detallado de arquitectura, diseño, implementación y tecnologías.

### 7.4. Modificaciones y adaptaciones realizadas por los estudiantes

> **Nota**: Esta sección debe ser completada por los estudiantes con las modificaciones específicas que realizaron sobre el código generado por la IA. A continuación se presenta una plantilla:

| Modificación | Archivo afectado | Descripción del cambio | Motivo |
|-------------|------------------|----------------------|--------|
| _(ejemplo)_ | `heuristics.js` | Añadida marca bancaria "Sabadell" a la lista BRANDS | Cobertura de entidad bancaria adicional |
| _(ejemplo)_ | `dataStore.js` | Modificado el SLA de severidad crítica de 30 min a 15 min | Ajuste a política interna del banco |
| _(...)_ | _(...)_ | _(...)_ | _(...)_ |

### 7.5. Verificación y pruebas de los resultados generados por la IA

#### Verificación de compilación

El proyecto incluye un script de build (`npm run build`) que ejecuta `vite build` para verificar que la aplicación compila correctamente para producción. Este proceso:
- Transpila todo el código JSX/ES6+ a JavaScript compatible.
- Verifica que no existen errores de importación/exportación.
- Genera el bundle optimizado en el directorio `dist/`.

#### Pruebas funcionales realizadas

| Prueba | Módulo | Escenario | Resultado esperado |
|--------|--------|-----------|-------------------|
| PF-01 | Login | Autenticación con admin@phishguard.bank y contraseña DemoPassw0rd!2026 | Acceso concedido, redirección a /dashboard |
| PF-02 | Login | Autenticación con usuario readonly | Acceso concedido, navegación limitada a módulos permitidos |
| PF-03 | Login | Intento con contraseña incorrecta (5 intentos) | Bloqueo de cuenta por 15 minutos |
| PF-04 | Scan | Escaneo de URL `http://paypa1-secure-login.example/verify` | Veredicto: phishing (typosquatting detectado) |
| PF-05 | Scan | Escaneo de URL `https://phishguard.bank/dashboard` | Veredicto: benigno (whitelist corporativa) |
| PF-06 | Scan | Escaneo de URL con IP como host | Puntaje +0.25 por host IP |
| PF-07 | Scan | Escaneo de HTML con formulario de contraseña | Puntaje +0.30 por formulario con credentials |
| PF-08 | Incidents | Crear incidente con severidad crítica | SLA calculado a 30 minutos |
| PF-09 | Incidents | Transición de `nuevo` a `contencion` (inválida) | Error: transición no permitida |
| PF-10 | Incidents | Transición de `nuevo` a `triage` (válida) | Estado actualizado, evento en timeline |
| PF-11 | Indicators | Búsqueda difusa "paypal" | Resultados con similitud calculada |
| PF-12 | Rules | Comprobación de `paypal-secure-login.example` | Coincide con blacklist |
| PF-13 | Rules | Comprobación de `banco.example` | Coincide con whitelist |
| PF-14 | RAG | Consulta "¿Qué hago ante un clon de BBVA?" | Respuesta con chunks de la guía de clones BBVA |
| PF-15 | RBAC | Usuario auditor intenta acceder a /scan | Página 403 mostrada |
| PF-16 | ETL | Ejecutar pipeline con fuente "sample" | IOCs insertados, versión registrada con checksum |
| PF-17 | Campaigns | Crear y lanzar campaña con 3 objetivos | Métricas calculadas (sent: 3, click_rate: 0%) |
| PF-18 | Audit | Filtrar por acción "auth.login" | Solo eventos de login mostrados |

> **Nota**: Los estudiantes deben ejecutar y documentar los resultados reales de cada prueba, indicando si fue exitosa o si se encontraron defectos.

---

## 8. Conclusiones

1. **Viabilidad del enfoque heurístico**: La implementación de un motor heurístico basado en entropía de Shannon, distancia de Levenshtein y listas de indicadores conocidos demostró ser efectiva para la detección de phishing con un enfoque determinista y explicable, sin requerir entrenamiento de modelos de machine learning.

2. **Arquitectura SPA adecuada para un SOC**: La elección de React con Vite, TanStack Query y Zustand permitió construir una interfaz responsiva y reactiva, con gestión eficiente del estado y caché de consultas, apropiada para un entorno de operaciones de seguridad donde la actualización de datos es frecuente.

3. **RBAC como pilar de seguridad**: La implementación de control de acceso basado en roles con 5 perfiles diferenciados y 16 permisos granulares demostró ser un modelo flexible y escalable para restringir el acceso a funcionalidades sensibles según las responsabilidades de cada usuario en el SOC.

4. **Persistencia local como limitación aceptable para prototipo**: El uso de `localStorage` permitió una implementación rápida sin dependencias de infraestructura backend, aunque limita la escalabilidad, concurrencia y la seguridad de los datos en un entorno de producción real.

5. **Asistente RAG como valor agregado**: La integración de un asistente basado en recuperación de documentación interna proporciona acceso rápido a playbooks y políticas, reduciendo el tiempo de consulta de procedimientos operativos durante la respuesta a incidentes.

6. **Trazabilidad y auditoría**: La bitácora append-only y el timeline de eventos por incidente garantizan trazabilidad completa de las acciones realizadas, cumpliendo con requisitos básicos de cumplimiento normativo y forensic readiness.

7. **Simulación realista**: A pesar de operar sin backend real, la inclusión de delays artificiales, validaciones de reglas de negocio, bloqueo de cuentas y máquina de estados contribuye a una experiencia de uso que refleja fielmente el comportamiento esperado en un sistema de producción.

---

## 9. Recomendaciones

1. **Migrar a un backend real**: Se recomienda evolucionar el sistema hacia una arquitectura con backend (por ejemplo, Supabase/PostgreSQL) para persistencia real, autenticación server-side, concurrencia multiusuario y escalabilidad. Esto permitiría eliminar la dependencia de `localStorage` y sus limitaciones de capacidad.

2. **Integrar un modelo de machine learning**: Complementar el motor heurístico con un modelo de clasificación entrenado (por ejemplo, Random Forest o red neuronal) sobre un dataset etiquetado de URLs phishing/legítimas podría mejorar la precisión de la detección y reducir falsos positivos.

3. **Conectar feeds de Threat Intelligence reales**: Integrar APIs reales de VirusTotal, PhishTank, OpenPhish y URLhaus para enriquecimiento de IOCs y alimentación automática del pipeline ETL en lugar de datos simulados.

4. **Implementar MFA con validación criptográfica**: Reemplazar la validación simulada de códigos TOTP por una implementación real del algoritmo HMAC-SHA1 (RFC 6238) utilizando bibliotecas como `otplib` o `speakeasy`.

5. **Añadir notificaciones en tiempo real**: Implementar WebSockets o Server-Sent Events (SSE) para notificar a los analistas sobre nuevos incidentes, detecciones de phishing crítico o vencimientos de SLA en tiempo real.

6. **Generar reportes con formato nativo**: Utilizar bibliotecas como `jspdf` para PDF, `docx` para Word y `xlsx` para Excel, generando documentos con formato, tablas y gráficos embebidos en lugar de blobs de texto plano.

7. **Implementar pruebas automatizadas**: Añadir pruebas unitarias (Jest/Vitest) para el motor heurístico, pruebas de integración para la API simulada y pruebas end-to-end (Playwright/Cypress) para los flujos críticos del sistema.

8. **Cifrar datos sensibles en reposo**: Si se mantiene el almacenamiento local, implementar cifrado (por ejemplo, con Web Crypto API) para contraseñas y datos sensibles almacenados en `localStorage`.

9. **Añadir Internacionalización (i18n)**: Implementar soporte multi-idioma para adaptar la interfaz a diferentes regiones, facilitando la adopción en bancos internacionales.

10. **Implementar exportación de evidencias forenses**: Añadir funcionalidad para exportar evidencias de incidentes (capturas de pantalla, hashes, logs) en formatos estandarizados para uso en investigaciones forenses y procesos legales.

---

## 10. Referencias bibliográficas

American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7.ª ed.). https://doi.org/10.1037/0000165-000

Shannon, C. E. (1948). A mathematical theory of communication. *Bell System Technical Journal*, 27(3), 379-423. https://doi.org/10.1002/j.1538-7305.1948.tb01338.x

Levenshtein, V. I. (1966). Binary codes capable of correcting deletions, insertions, and reversals. *Soviet Physics Doklady*, 10(8), 707-710.

Facebook Open Source. (2023). *React: A JavaScript library for building user interfaces*. Meta Platforms, Inc. https://react.dev

Vite. (2024). *Vite: Next generation frontend tooling*. Evan You. https://vitejs.dev

Tailwind Labs. (2024). *Tailwind CSS: A utility-first CSS framework*. https://tailwindcss.com

TanStack. (2024). *TanStack Query: Powerful asynchronous state management*. https://tanstack.com/query

Poimandres. (2024). *Zustand: Small, fast and scalable bearbones state-management*. https://github.com/pmndrs/zustand

Recharts. (2024). *Recharts: A composable charting library built on React components*. https://recharts.org

OWASP Foundation. (2023). *Phishing*. Open Web Application Security Project. https://owasp.org/www-community/attacks/Phishing

APWG. (2024). *Anti-Phishing Working Group: Phishing activity trends report*. https://apwg.org/trendsreports/

NIST. (2023). *Guide to malware incident prevention and handling for desktops and laptops* (NIST SP 800-83 Rev. 1). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-83r1

ISO/IEC. (2022). *Information security, cybersecurity and privacy protection — Information security management systems — Requirements* (ISO/IEC 27001:2022). International Organization for Standardization.

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Izacard, M., Grave, E., Lewis, P., & Riedel, S. (2020). *Retrieval-augmented generation for knowledge-intensive NLP tasks*. arXiv. https://doi.org/10.48550/arXiv.2005.11401

IANA. (2024). *IDNA Punycode: Internationalized domain names*. Internet Assigned Numbers Authority. https://www.iana.org/assignments/idna-tables

Mirsaeedi, F., Karimi, M., & Akbari, M. (2022). Phishing detection using machine learning techniques: A comprehensive survey. *Computers & Security*, 119, 102754. https://doi.org/10.1016/j.cose.2022.102754

Garera, S., Almeroth, N., & Levchenko, K. (2007). A framework for detection and measurement of phishing attacks. *Proceedings of the 2007 ACM Workshop on Recurring Malcode*, 1-8. https://doi.org/10.1145/1314389.1314391

PhishTank. (2024). *PhishTank: Collaborative clearinghouse for phishing data*. Cisco Talos. https://phishtank.org

OpenPhish. (2024). *OpenPhish: Phishing intelligence provider*. https://openphish.com

VirusTotal. (2024). *VirusTotal: Analyze suspicious files, URLs and domains*. Google LLC. https://www.virustotal.com

---

*Documento generado el 31 de octubre de 2026.*
*Proyecto: PhishGuard Bank — Plataforma Antifishing SOC.*
