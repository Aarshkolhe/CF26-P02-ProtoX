import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { decideApproval, triggerWorkflow } from "../coordinator.js";
import { HttpError } from "../httpError.js";
import { DEFAULT_APPROVAL_TIMEOUT_MS } from "../scenario.js";

export const workflowsRouter = Router();

const stepsOrder = { steps: { orderBy: { sequence: "asc" as const } } };

const triggerSchema = z.object({
  vendorName: z.string().trim().min(1).max(200),
  billingAmount: z.string().trim().max(50).optional().default(""),
  requestedBy: z.string().trim().max(200).optional().default(""),
  approvalTimeoutMs: z.number().int().positive().max(3_600_000).optional(),
});

workflowsRouter.post("/", async (req, res, next) => {
  try {
    const body = triggerSchema.parse(req.body);
    const context = {
      vendorName: body.vendorName,
      billingAmount: body.billingAmount,
      requestedBy: body.requestedBy,
    };
    const id = await triggerWorkflow(context, body.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS);
    const workflow = await prisma.workflowInstance.findUniqueOrThrow({ where: { id }, include: stepsOrder });
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get("/", async (_req, res, next) => {
  try {
    const workflows = await prisma.workflowInstance.findMany({
      include: stepsOrder,
      orderBy: { createdAt: "desc" },
    });
    res.json(workflows);
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get("/:id", async (req, res, next) => {
  try {
    const workflow = await prisma.workflowInstance.findUnique({ where: { id: req.params.id }, include: stepsOrder });
    if (!workflow) throw new HttpError(404, `Workflow ${req.params.id} not found`);
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get("/:id/audit", async (req, res, next) => {
  try {
    const workflow = await prisma.workflowInstance.findUnique({ where: { id: req.params.id } });
    if (!workflow) throw new HttpError(404, `Workflow ${req.params.id} not found`);
    const entries = await prisma.auditLogEntry.findMany({
      where: { workflowId: req.params.id },
      orderBy: { timestamp: "asc" },
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

workflowsRouter.post("/:id/steps/:stepId/decision", async (req, res, next) => {
  try {
    const { decision } = decisionSchema.parse(req.body);
    await decideApproval(req.params.id, req.params.stepId, decision);
    const workflow = await prisma.workflowInstance.findUniqueOrThrow({ where: { id: req.params.id }, include: stepsOrder });
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

// Demo convenience: clears all workflows (cascades to steps, audit log,
// jobs) plus idempotency keys. Not something a production coordinator
// would expose.
workflowsRouter.delete("/", async (_req, res, next) => {
  try {
    await prisma.workflowInstance.deleteMany({});
    await prisma.idempotencyKey.deleteMany({});
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
