import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../db/client.js";
import { defectEvents, labeledSamples } from "../db/schema.js";
import { ApiError } from "../lib/api-error.js";

const confirmSchema = z.object({
  defect_type: z.string().min(1),
  verified_by: z.string().min(1),
});

const rejectSchema = z.object({
  reason: z.string().min(1),
  verified_by: z.string().min(1),
});

async function loadPendingDefect(id: string) {
  const [row] = await db
    .select()
    .from(defectEvents)
    .where(eq(defectEvents.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(
      404,
      "DEFECT_NOT_FOUND",
      `Defect event ${id} tidak ditemukan`,
    );
  }
  if (row.status !== "PENDING_REVIEW") {
    throw new ApiError(
      409,
      "ALREADY_VERIFIED",
      `Defect event ${id} sudah diverifikasi sebelumnya (status: ${row.status})`,
    );
  }
  return row;
}

export const verificationRoute = new Hono();

verificationRoute.post("/verification/:id/confirm", async (c) => {
  const id = c.req.param("id");
  await loadPendingDefect(id);

  const body = confirmSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      body.error.issues.map((i) => i.message).join(", "),
    );
  }

  const verifiedAt = new Date();
  const [updated] = await db
    .update(defectEvents)
    .set({
      status: "CONFIRMED",
      defectType: body.data.defect_type,
      verifiedBy: body.data.verified_by,
      verifiedAt,
    })
    .where(eq(defectEvents.id, id))
    .returning();

  await db.insert(labeledSamples).values({
    defectEventId: id,
    label: "confirmed",
    defectType: body.data.defect_type,
  });

  return c.json({
    id: updated.id,
    status: updated.status,
    defect_type: updated.defectType,
    verified_at: updated.verifiedAt?.toISOString() ?? null,
  });
});

verificationRoute.post("/verification/:id/reject", async (c) => {
  const id = c.req.param("id");
  await loadPendingDefect(id);

  const body = rejectSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      body.error.issues.map((i) => i.message).join(", "),
    );
  }

  const verifiedAt = new Date();
  const [updated] = await db
    .update(defectEvents)
    .set({
      status: "FALSE_POSITIVE",
      rejectReason: body.data.reason,
      verifiedBy: body.data.verified_by,
      verifiedAt,
    })
    .where(eq(defectEvents.id, id))
    .returning();

  await db.insert(labeledSamples).values({
    defectEventId: id,
    label: "false_positive",
  });

  return c.json({
    id: updated.id,
    status: updated.status,
    defect_type: updated.defectType,
    verified_at: updated.verifiedAt?.toISOString() ?? null,
  });
});
