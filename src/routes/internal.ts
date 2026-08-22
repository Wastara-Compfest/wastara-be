import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Hono } from "hono";
import { z } from "zod";

import { config } from "../config.js";
import { db } from "../db/client.js";
import { defectEvents } from "../db/schema.js";
import { ApiError } from "../lib/api-error.js";
import { nextDefectId } from "../lib/generate-defect-id.js";
import { serializeDefectEvent } from "../lib/serializers.js";
import { broadcast } from "../ws/hub.js";

const MAX_EVIDENCE_BYTES = 500 * 1024;

const payloadSchema = z.object({
  machine_id: z.string().min(1),
  mode: z.enum(["penenunan", "penjahitan"]),
  anomaly_score: z.number().min(0).max(1),
  bbox: z.object({
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
  }),
  frames: z.object({
    start: z.number().int(),
    end: z.number().int(),
  }),
});

export const internalRoute = new Hono();

internalRoute.use("/internal/*", async (c, next) => {
  const key = c.req.header("X-Internal-Key");
  if (!key || key !== config.internalApiKey) {
    throw new ApiError(401, "UNAUTHORIZED", "X-Internal-Key tidak valid");
  }
  await next();
});

internalRoute.post("/internal/defect-events", async (c) => {
  const form = await c.req.parseBody();

  const rawData = form["data"];
  if (typeof rawData !== "string") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Field 'data' (JSON string) wajib ada",
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Field 'data' bukan JSON valid");
  }

  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(", "),
    );
  }
  const body = parsed.data;

  const evidence = form["evidence"];
  if (!(evidence instanceof File)) {
    throw new ApiError(400, "EVIDENCE_REQUIRED", "Field 'evidence' (file) wajib ada");
  }
  if (evidence.size > MAX_EVIDENCE_BYTES) {
    throw new ApiError(
      400,
      "EVIDENCE_TOO_LARGE",
      `Evidence melebihi batas ${MAX_EVIDENCE_BYTES} bytes`,
    );
  }

  const id = await nextDefectId();
  const evidenceFilename = `${id}.jpg`;

  await mkdir(config.evidenceDir, { recursive: true });
  const buffer = Buffer.from(await evidence.arrayBuffer());
  await writeFile(path.join(config.evidenceDir, evidenceFilename), buffer);

  const [inserted] = await db
    .insert(defectEvents)
    .values({
      id,
      machineId: body.machine_id,
      mode: body.mode,
      anomalyScore: body.anomaly_score,
      bboxX: body.bbox.x,
      bboxY: body.bbox.y,
      bboxW: body.bbox.w,
      bboxH: body.bbox.h,
      frameStart: body.frames.start,
      frameEnd: body.frames.end,
      evidencePath: evidenceFilename,
    })
    .returning();

  broadcast(
    JSON.stringify({ type: "defect_alert", defect: serializeDefectEvent(inserted) }),
  );

  return c.json({ id, status: "PENDING_REVIEW" }, 201);
});
