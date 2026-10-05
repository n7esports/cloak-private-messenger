import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });
const queues = new Map();

function reply(ws, request, response) {
  ws.send(
    JSON.stringify({
      status: "ok",
      ...response,
      ...(request.id !== undefined ? { id: request.id } : {}),
    })
  );
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      ws.send(JSON.stringify({ status: "error", message: "Invalid format" }));
      return;
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      ws.send(JSON.stringify({ status: "error", message: "Invalid request" }));
      return;
    }

    if (data.action === "create") {
      const queueId = randomUUID();
      queues.set(queueId, []);
      reply(ws, data, { action: "create", queueId });
      return;
    }

    if (data.action === "push") {
      const { queueId, payload } = data;
      if (typeof queueId !== "string" || typeof payload !== "string") {
        ws.send(
          JSON.stringify({
            status: "error",
            action: "push",
            message: "Invalid queue ID or payload",
            ...(data.id !== undefined ? { id: data.id } : {}),
          })
        );
        return;
      }

      if (!queues.has(queueId)) queues.set(queueId, []);
      queues.get(queueId).push(payload);
      reply(ws, data, { action: "push", queueId });
      return;
    }

    if (data.action === "pull") {
      const { queueId } = data;
      if (typeof queueId !== "string") {
        ws.send(
          JSON.stringify({
            status: "error",
            action: "pull",
            message: "Invalid queue ID",
            ...(data.id !== undefined ? { id: data.id } : {}),
          })
        );
        return;
      }

      const messages = queues.get(queueId) || [];
      queues.delete(queueId);
      reply(ws, data, { action: "pull", queueId, messages });
      return;
    }

    ws.send(
      JSON.stringify({
        status: "error",
        message: "Unknown action",
        ...(data.id !== undefined ? { id: data.id } : {}),
      })
    );
  });
});

console.log(`Cloak Relay Server running on ws://localhost:${PORT}`);
