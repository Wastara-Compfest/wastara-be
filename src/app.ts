import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { ApiError } from "./lib/api-error.js";
import { analyticsRoute } from "./routes/analytics.js";
import { cameraRoute } from "./routes/camera.js";
import { defectTypesRoute } from "./routes/defect-types.js";
import { defectsRoute } from "./routes/defects.js";
import { evidenceRoute } from "./routes/evidence.js";
import { healthRoute } from "./routes/health.js";
import { internalRoute } from "./routes/internal.js";
import { verificationRoute } from "./routes/verification.js";

export const app = new Hono();

app.use(logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.route("/", healthRoute);
app.route("/", cameraRoute);
app.route("/", defectsRoute);
app.route("/", defectTypesRoute);
app.route("/", verificationRoute);
app.route("/", evidenceRoute);
app.route("/", internalRoute);
app.route("/", analyticsRoute);

app.notFound((c) =>
  c.json(
    { error: true, kode: "NOT_FOUND", pesan: "Endpoint tidak ditemukan" },
    404,
  ),
);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(err.toBody(), err.status as ContentfulStatusCode);
  }
  console.error(err);
  return c.json(
    { error: true, kode: "INTERNAL_ERROR", pesan: "Terjadi kesalahan internal" },
    500,
  );
});
