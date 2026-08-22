import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../db/client.js";
import { defectEvents, defectStatus } from "../db/schema.js";
import { ApiError } from "../lib/api-error.js";
import { serializeDefectEvent } from "../lib/serializers.js";

const listQuerySchema = z.object({
  status: z.enum(defectStatus.enumValues).optional(),
  machine_id: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional().default(20),
});

export const defectsRoute = new Hono();

defectsRoute.get("/defects", async (c) => {
  const parsed = listQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(", "),
    );
  }
  const { status, machine_id, limit } = parsed.data;

  const conditions = [
    status ? eq(defectEvents.status, status) : undefined,
    machine_id ? eq(defectEvents.machineId, machine_id) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const rows = await db
    .select()
    .from(defectEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(defectEvents.createdAt))
    .limit(limit);

  return c.json({ items: rows.map(serializeDefectEvent) });
});

defectsRoute.get("/defects/:id", async (c) => {
  const id = c.req.param("id");
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

  return c.json(serializeDefectEvent(row));
});
