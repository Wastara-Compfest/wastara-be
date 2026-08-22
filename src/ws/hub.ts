import type { WebSocket } from "ws";

const publicClients = new Set<WebSocket>();

export function registerPublicClient(ws: WebSocket) {
  publicClients.add(ws);
  ws.on("close", () => publicClients.delete(ws));
}

export function broadcast(data: string | Buffer) {
  for (const client of publicClients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

export function publicClientCount() {
  return publicClients.size;
}
