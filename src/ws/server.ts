import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import type { ServerType } from "@hono/node-server";
import { WebSocketServer } from "ws";

import { config } from "../config.js";
import { broadcast, registerPublicClient } from "./hub.js";

export function attachWebSocketServer(server: ServerType) {
  const publicWss = new WebSocketServer({ noServer: true });
  const internalWss = new WebSocketServer({ noServer: true });

  publicWss.on("connection", (ws) => {
    registerPublicClient(ws);
  });

  internalWss.on("connection", (ws) => {
    ws.on("message", (data, isBinary) => {
      broadcast(isBinary ? (data as Buffer) : data.toString());
    });
  });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "", "http://internal");

    if (url.pathname === "/ws/live") {
      publicWss.handleUpgrade(req, socket, head, (ws) => {
        publicWss.emit("connection", ws, req);
      });
      return;
    }

    if (url.pathname === "/internal/ws/frames") {
      const key = req.headers["x-internal-key"];
      if (key !== config.internalApiKey) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      internalWss.handleUpgrade(req, socket, head, (ws) => {
        internalWss.emit("connection", ws, req);
      });
      return;
    }

    socket.destroy();
  });
}
