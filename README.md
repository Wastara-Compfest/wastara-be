# wastara-be

Backend API untuk Wastara — dibangun dengan **Hono** (TypeScript/Node.js). Ini satu-satunya pintu API yang dipanggil frontend (`wastara-fe`); komunikasi dengan model service AI (`wastara-model`, Python/OpenCV/PyTorch) terjadi lewat proxy/internal API, bukan diakses langsung oleh frontend. Detail arsitektur lengkap di `script/Technical Spec Wastara.md` §1–§2 (repo terpisah per komponen — wajib untuk kompetisi).

## Arsitektur singkat

```
wastara-fe (Next.js)
      │  REST + WebSocket
      ▼
wastara-be (Hono)  ←── satu-satunya API yang dilihat frontend
      │  proxy /camera/*         │  terima POST defect event
      │  relay live frame        │  (internal, X-Internal-Key)
      ▼                          ▼
wastara-model (Python/FastAPI, repo terpisah)
```

Backend tetap bisa dites standalone (§7.2 spec) tanpa model service jalan — endpoint `/defects`, `/verification`, `/analytics` hanya bergantung ke database. Endpoint `/camera/*` akan balas `503 MODEL_SERVICE_UNAVAILABLE` kalau model service belum ada/mati.

## Setup lokal (tanpa Docker)

```bash
npm install
cp .env.example .env   # sesuaikan DATABASE_URL, dll.
```

Butuh PostgreSQL jalan (lokal atau container manual):

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

## Setup dengan Docker Compose (backend + db)

```bash
docker compose up --build
```

Ini menjalankan migration otomatis lalu start server (lihat `command` di `docker-compose.yml`). Backend di `http://localhost:8000`, Postgres di `localhost:5432`. `wastara-model` **tidak** ikut di compose ini karena repo terpisah — set `MODEL_SERVICE_URL` ke tempat model service jalan (default `http://host.docker.internal:8100` untuk model service yang jalan di host saat dev; ganti sesuai kebutuhan di Linux atau saat model service juga di-container-kan terpisah).

## Environment variables

| Variable | Default (`.env.example`) | Keterangan |
|---|---|---|
| `PORT` | `8000` | Port HTTP backend |
| `DATABASE_URL` | `postgresql://wastara:wastara@localhost:5432/wastara` | Koneksi Postgres |
| `EVIDENCE_DIR` | `./data/evidence` | Folder penyimpanan crop JPG defect |
| `MODEL_SERVICE_URL` | `http://localhost:8100` | Base URL `wastara-model`, dipakai proxy `/camera/*` |
| `INTERNAL_API_KEY` | `change-me` | Shared secret untuk endpoint internal (`X-Internal-Key`) — **wajib diganti di luar dev** |

## Skrip

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript ke `dist/` |
| `npm start` | Jalankan build hasil `npm run build` |
| `npm run typecheck` | Cek tipe tanpa emit |
| `npm run db:generate -- --name <nama_migration>` | Generate migration SQL dari `src/db/schema.ts` — **selalu pakai `--name`** (mis. `add_quality_map_fields`), jangan biarkan drizzle-kit generate nama acak |
| `npm run db:migrate` | Terapkan migration ke database (dev, pakai `tsx`) |
| `npm run db:migrate:prod` | Sama, tapi jalan dari `dist/` (dipakai image Docker, tidak butuh `tsx`) |

## API

### Public (dipanggil frontend)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/camera/start` | Proxy ke model service |
| POST | `/camera/stop` | Proxy ke model service |
| GET | `/camera/status` | Proxy ke model service |
| WS | `/ws/live` | Relay live frame + broadcast `defect_alert` |
| GET | `/defects?status=&machine_id=&limit=` | List defect event |
| GET | `/defects/:id` | Detail satu defect event |
| POST | `/verification/:id/confirm` | Confirm defect (`{defect_type, verified_by}`) |
| POST | `/verification/:id/reject` | Reject defect (`{reason, verified_by}`) |
| GET | `/evidence/:filename` | Serve crop JPG |
| GET | `/analytics/summary?machine_id=&hours=` | Ringkasan defect rate |
| GET | `/analytics/quality-map?session_id=` | Titik defect confirmed di roll (butuh `meter`/`position` terisi saat ingestion) |

### Internal (dipanggil `wastara-model`, butuh header `X-Internal-Key`)

| Method | Path | Keterangan |
|---|---|---|
| POST | `/internal/defect-events` | `multipart/form-data`: field `data` (JSON) + `evidence` (file JPG) |
| WS | `/internal/ws/frames` | Kirim frame (binary/string) untuk di-relay ke `/ws/live` |

Detail kontrak lengkap (bentuk JSON, kode error) ada di `script/Technical Spec Wastara.md` §5.

## Status implementasi

- [x] Fase 1 — Scaffolding: Hono app, koneksi DB (Drizzle + PostgreSQL), schema `defect_events`/`production_sessions`/`labeled_samples`, format error standar, `/health`.
- [x] Fase 2 — Defects & verification API: `GET /defects`, `GET /defects/:id`, `POST /verification/:id/confirm|reject`, insert `labeled_samples`, serve `/evidence/*`.
- [x] Fase 3 — Internal defect event ingestion: `POST /internal/defect-events` (auth `X-Internal-Key`, ID sekuensial `DEF-xxxxx`, simpan evidence crop).
- [x] Fase 4 — Camera proxy: `POST /camera/start|stop`, `GET /camera/status` forward ke `MODEL_SERVICE_URL`, fallback `503 MODEL_SERVICE_UNAVAILABLE` kalau model service down.
- [x] Fase 5 — WebSocket: `/ws/live` (publik, ke frontend) relay frame dari `/internal/ws/frames` (model service, auth `X-Internal-Key`) dan broadcast `defect_alert` saat defect event baru dibuat.
- [x] Fase 6 — Analytics: `GET /analytics/summary`, `GET /analytics/quality-map`. Menambah kolom opsional `session_id`/`meter`/`position` ke `defect_events` (diisi model service saat ingestion) untuk mendukung quality map.
- [x] Fase 7 — Docker + polish: multi-stage `Dockerfile`, `docker-compose.yml` (backend + db, auto-migrate on start), `.dockerignore`, README lengkap.

Backend selesai sesuai kontrak di Technical Spec §5. Yang masih pending di luar cakupan repo ini: `wastara-model` (Python) dan `wastara-fe` (Next.js) — keduanya repo terpisah.
