import fs from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db/client.js";
import { videoInspections } from "../db/schema.js";
import { ApiError } from "../lib/api-error.js";
import { callModelServiceMultipart } from "../lib/model-service-client.js";

export const videoInspectionsRoute = new Hono();

videoInspectionsRoute.post("/video-inspections", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const machineId =
    typeof body["machine_id"] === "string" ? body["machine_id"] : "LOOM-01";
  if (!file || !(file instanceof File)) {
    throw new ApiError(400, "VALIDATION_ERROR", "File video harus diunggah");
  }

  const uploadsDir = path.resolve("data/uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;
  const filepath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const [job] = await db
    .insert(videoInspections)
    .values({
      machineId,
      filename: file.name,
      videoPath: path.resolve(filepath),
      status: "queued",
    })
    .returning();

  const form = new FormData();
  form.append("file", new Blob([buffer]), file.name);
  form.append("machine_id", machineId);
  form.append("video_inspection_id", job.id);

  const { status } = await callModelServiceMultipart(
    "/inspections/video",
    form,
  );
  if (status >= 400) {
    await db
      .update(videoInspections)
      .set({ status: "failed", errorMessage: "Model service menolak job" })
      .where(eq(videoInspections.id, job.id));
    throw new ApiError(
      502,
      "MODEL_SERVICE_ERROR",
      "Model service gagal memulai inspeksi video",
    );
  }

  await db
    .update(videoInspections)
    .set({ status: "processing" })
    .where(eq(videoInspections.id, job.id));

  return c.json({ id: job.id, status: "processing" }, 202);
});

videoInspectionsRoute.get("/video-inspections/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(videoInspections)
    .where(eq(videoInspections.id, id))
    .limit(1);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Job tidak ditemukan");
  }
  return c.json({
    id: row.id,
    status: row.status,
    filename: row.filename,
    machine_id: row.machineId,
    created_at: row.createdAt.toISOString(),
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    defect_count: row.defectCount,
    error_message: row.errorMessage,
  });
});
