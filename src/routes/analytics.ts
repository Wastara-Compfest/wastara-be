import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../db/client.js";
import { defectEvents, productionSessions } from "../db/schema.js";
import { ApiError } from "../lib/api-error.js";

const summaryQuerySchema = z.object({
  machine_id: z.string().optional(),
  hours: z.coerce.number().positive().max(24 * 30).optional().default(24),
});

const qualityMapQuerySchema = z.object({
  session_id: z.string().uuid(),
});

export const analyticsRoute = new Hono();

analyticsRoute.get("/analytics/summary", async (c) => {
  const parsed = summaryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(", "),
    );
  }
  const { machine_id, hours } = parsed.data;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const defectConditions = [
    gte(defectEvents.createdAt, since),
    machine_id ? eq(defectEvents.machineId, machine_id) : undefined,
  ].filter((cnd): cnd is NonNullable<typeof cnd> => cnd !== undefined);

  const statusCounts = await db
    .select({
      status: defectEvents.status,
      count: sql<number>`count(*)::int`,
    })
    .from(defectEvents)
    .where(and(...defectConditions))
    .groupBy(defectEvents.status);

  const counts = { PENDING_REVIEW: 0, CONFIRMED: 0, FALSE_POSITIVE: 0 };
  for (const row of statusCounts) {
    counts[row.status] = row.count;
  }
  const potentialDefects =
    counts.PENDING_REVIEW + counts.CONFIRMED + counts.FALSE_POSITIVE;

  const sessionConditions = [
    gte(productionSessions.startedAt, since),
    machine_id ? eq(productionSessions.machineId, machine_id) : undefined,
  ].filter((cnd): cnd is NonNullable<typeof cnd> => cnd !== undefined);

  const [metersRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${productionSessions.metersProduced}), 0)::float`,
    })
    .from(productionSessions)
    .where(and(...sessionConditions));

  const metersInspected = metersRow?.total ?? 0;
  const defectRatePercent =
    metersInspected > 0
      ? Math.round((potentialDefects / metersInspected) * 100 * 100) / 100
      : 0;

  return c.json({
    machine_id: machine_id ?? null,
    potential_defects: potentialDefects,
    confirmed: counts.CONFIRMED,
    false_positives: counts.FALSE_POSITIVE,
    pending_review: counts.PENDING_REVIEW,
    defect_rate_percent: defectRatePercent,
    meters_inspected: metersInspected,
  });
});

analyticsRoute.get("/analytics/quality-map", async (c) => {
  const parsed = qualityMapQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(", "),
    );
  }

  const rows = await db
    .select({
      meter: defectEvents.meter,
      position: defectEvents.position,
      status: defectEvents.status,
      defectType: defectEvents.defectType,
    })
    .from(defectEvents)
    .where(
      and(
        eq(defectEvents.sessionId, parsed.data.session_id),
        eq(defectEvents.status, "CONFIRMED"),
        isNotNull(defectEvents.meter),
        isNotNull(defectEvents.position),
      ),
    )
    .orderBy(defectEvents.meter);

  return c.json({
    points: rows.map((r) => ({
      meter: r.meter,
      position: r.position,
      status: r.status,
      type: r.defectType,
    })),
  });
});
