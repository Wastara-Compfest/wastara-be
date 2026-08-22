import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

import { ApiError } from "../lib/api-error.js";
import { callModelService } from "../lib/model-service-client.js";

const startSchema = z.object({
  source: z.string().min(1),
  machine_id: z.string().min(1),
  mode: z.enum(["penenunan", "penjahitan"]),
});

export const cameraRoute = new Hono();

cameraRoute.post("/camera/start", async (c) => {
  const parsed = startSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join(", "),
    );
  }

  const { status, body } = await callModelService(
    "POST",
    "/camera/start",
    parsed.data,
  );
  return c.json(body, status as ContentfulStatusCode);
});

cameraRoute.post("/camera/stop", async (c) => {
  const { status, body } = await callModelService("POST", "/camera/stop");
  return c.json(body, status as ContentfulStatusCode);
});

cameraRoute.get("/camera/status", async (c) => {
  const { status, body } = await callModelService("GET", "/camera/status");
  return c.json(body, status as ContentfulStatusCode);
});
