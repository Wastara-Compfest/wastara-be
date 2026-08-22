# wastara-be

Backend API untuk Wastara — dibangun dengan **Hono** (TypeScript/Node.js). Ini satu-satunya pintu API yang dipanggil frontend (`wastara-fe`); komunikasi dengan model service AI (`wastara-model`) terjadi lewat proxy/internal API, bukan diakses langsung oleh frontend. Detail arsitektur di `script/Technical Spec Wastara.md` §1–§2 (repo terpisah).

## Setup lokal

```bash
npm install
cp .env.example .env   # sesuaikan DATABASE_URL, dll.
```

Butuh PostgreSQL jalan (lokal atau via Docker):

```bash
docker run --name wastara-db -e POSTGRES_USER=wastara -e POSTGRES_PASSWORD=wastara -e POSTGRES_DB=wastara -p 5432:5432 -d postgres:16-alpine
npm run db:migrate
```

Jalankan server dev:

```bash
npm run dev
```

Cek:

```bash
curl http://localhost:8000/health
```

## Skrip

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript ke `dist/` |
| `npm start` | Jalankan build hasil `npm run build` |
| `npm run typecheck` | Cek tipe tanpa emit |
| `npm run db:generate` | Generate migration SQL dari `src/db/schema.ts` |
| `npm run db:migrate` | Terapkan migration ke database |

## Status implementasi

- [x] Fase 1 — Scaffolding: Hono app, koneksi DB (Drizzle + PostgreSQL), schema `defect_events`/`production_sessions`/`labeled_samples`, format error standar, `/health`.
- [x] Fase 2 — Defects & verification API: `GET /defects`, `GET /defects/:id`, `POST /verification/:id/confirm|reject`, insert `labeled_samples`, serve `/evidence/*`.
- [x] Fase 3 — Internal defect event ingestion: `POST /internal/defect-events` (auth `X-Internal-Key`, ID sekuensial `DEF-xxxxx`, simpan evidence crop).
- [x] Fase 4 — Camera proxy: `POST /camera/start|stop`, `GET /camera/status` forward ke `MODEL_SERVICE_URL`, fallback `503 MODEL_SERVICE_UNAVAILABLE` kalau model service down.
- [ ] Fase 5 — WebSocket `/ws/live`
- [ ] Fase 6 — Analytics
- [ ] Fase 7 — Docker + polish
