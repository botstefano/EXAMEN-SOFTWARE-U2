# PhishGuard Bank — Plataforma Antifishing SOC

Plataforma bancaria de detección, respuesta a incidentes y análisis antifraude/phishing reescrita en React con Vite, Tailwind CSS, TanStack Query y Zustand.

## Características Principales

- **Dashboard SOC en Tiempo Real**: Métricas de phishing 30d, falsos positivos, MTTR, SLAs vencidos, gráficos de tendencias y canales de ataque.
- **Motor Heurístico de Detección**: Análisis de URLs, texto y HTML calculando entropía de Shannon, distancia de Levenshtein contra marcas bancarias (PayPal, BBVA, Santander, CaixaBank, Bankinter, Visa, etc.), detección de TLDs maliciosos, homographs punycode y campos de credenciales.
- **Gestión Integral de Incidentes**: Ciclo de vida con máquina de estados (`nuevo` → `triage` → `investigacion` → `contencion` → `cerrado` / `falso_positivo`), cálculo y alertas de SLA según severidad, y timeline de eventos.
- **Indicadores de Compromiso (IOCs)**: Búsqueda difusa (fuzzy search) y enriquecimiento con Threat Intelligence.
- **Control de Reglas**: Gestión de listas negras (Blacklist) y listas blancas (Whitelist) con verificador en tiempo real.
- **Threat Hunting**: Búsqueda avanzada por filtros y correlación cruzada de IOCs con detecciones e incidentes.
- **Asistente SOC (RAG)**: Consulta interactiva sobre playbooks operativos, políticas de retención y análisis de homograph attacks con citas de fuentes documentales.
- **Campañas de Phishing Simulado**: Creación de plantillas, importación de objetivos, lanzamiento y cálculo de click rate y report rate.
- **Pipelines ETL**: Ingesta de fuentes de telemetría con versionado y cálculo de checksums SHA-256.
- **Generación de Reportes**: Exportación de reportes de KPIs, detalle de incidente y gestión mensual en PDF, Word (.docx) y Excel (.xlsx).
- **Cumplimiento Regulatorio y Auditoría**: Monitoreo de controles de seguridad, tasa de cumplimiento de SLA y exportación de bitácora en JSON.
- **Gestión de Usuarios y RBAC**: Control de acceso basado en roles (`admin`, `analista_soc`, `auditor`, `reportes`, `readonly`), cambio de credenciales y autenticación multifactor (TOTP MFA).

## Usuarios de Demostración
- **Elena Navarro (Admin)**: `admin@phishguard.bank`
- **María López (Analista SOC)**: `maria.lopez@phishguard.bank`
- **Carlos Ruiz (Analista SOC)**: `carlos.ruiz@phishguard.bank`
- **Ana Torres (Auditor)**: `ana.torres@phishguard.bank`
- **Javier Méndez (Reportes)**: `javier.mendez@phishguard.bank`
- **Consulta Externa (Readonly)**: `audit.viewer@phishguard.bank`

Contraseña por defecto: `DemoPassw0rd!2026`

## Ejecución y Construcción
```bash
npm install
npm run dev # Servidor en http://0.0.0.0:3000
npm run build # Compilación de producción
```
