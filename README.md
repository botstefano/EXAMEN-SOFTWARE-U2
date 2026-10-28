# PhishGuard Bank — Plataforma antifishing

Backend FastAPI + PostgreSQL, frontend React/Vite/Tailwind. Todo corre con Docker Compose.

## Arranque rápido (Docker)
```bash
cp .env.example .env
docker compose up --build
```
- Frontend: http://localhost:5173
- API / Swagger: http://localhost:8000/docs
- Login demo: `admin@phishguard.bank` / `DemoPassw0rd!2026`
  (también `maria.lopez@`, `carlos.ruiz@`, `ana.torres@`, `javier.mendez@`, `audit.viewer@phishguard.bank`, misma clave)

Al primer arranque el backend crea las tablas y carga datos semilla (AUTO_SEED=true).
Para reiniciar de cero: `docker compose down -v`.

## Arranque sin Docker
Requisitos: Python 3.11+, Node 20+, PostgreSQL 14+ (con extensión pg_trgm).
```bash
createdb phishguard
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://USER:PASS@localhost:5432/phishguard
uvicorn app.main:app --reload --port 8000
# otra terminal
cd frontend && npm install && npm run dev
```

## Notas
- Escaneo de URL: heurísticas + listas de reglas + IOCs + análisis de texto/HTML. DNS/WHOIS reales: `ENABLE_NETWORK_CHECKS=true`.
- LLM opcional: `LLM_PROVIDER=ollama` (y `OLLAMA_URL`). Sin LLM el asistente SOC responde con los fragmentos más relevantes.
- ETL: fuente `sample` funciona offline; `phishtank`/`openphish` requieren internet.
- Tests: `cd backend && pytest`.
