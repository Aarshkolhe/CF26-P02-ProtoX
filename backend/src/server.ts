import "dotenv/config";
import cors from "cors";
import express from "express";
import { resumeAll } from "./coordinator.js";
import { prisma } from "./db.js";
import { errorHandler } from "./errorHandler.js";
import { startPoller } from "./poller.js";
import { workflowsRouter } from "./routes/workflows.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/workflows", workflowsRouter);

app.use(errorHandler);

async function main() {
  await prisma.$connect();
  console.log("[db] connected");

  await resumeAll();

  startPoller();
  console.log("[poller] started");

  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
