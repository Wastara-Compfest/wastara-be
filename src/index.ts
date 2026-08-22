import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { config } from "./config.js";
import { attachWebSocketServer } from "./ws/server.js";

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`wastara-be listening on http://localhost:${info.port}`);
});

attachWebSocketServer(server);
