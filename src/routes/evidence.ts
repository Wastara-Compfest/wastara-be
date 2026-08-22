import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import { config } from "../config.js";

export const evidenceRoute = new Hono();

evidenceRoute.get(
  "/evidence/*",
  serveStatic({
    root: config.evidenceDir,
    rewriteRequestPath: (path) => path.replace(/^\/evidence/, ""),
  }),
);
