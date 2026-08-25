import { Router } from "express";
import { workflowEvents } from "../events.js";
import type { WorkflowUpdateEvent } from "../events.js";

export const eventsRouter = Router();

const HEARTBEAT_MS = 25_000;

eventsRouter.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  const send = (event: WorkflowUpdateEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  workflowEvents.on("update", send);

  // Keeps the connection alive through proxies/load balancers that would
  // otherwise time out an idle HTTP connection.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    workflowEvents.off("update", send);
  });
});
