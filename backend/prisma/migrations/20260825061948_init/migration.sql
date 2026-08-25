-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('running', 'awaiting_approval', 'completed', 'compensating', 'compensated', 'failed');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('service', 'approval');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('pending', 'running', 'awaiting_approval', 'succeeded', 'failed', 'compensating', 'compensated', 'skipped');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected', 'timeout');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('approval_timeout', 'step_retry', 'compensation_step');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'done', 'cancelled');

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflow_type" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'running',
    "context" JSONB NOT NULL,
    "approval_timeout_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_history" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "service" TEXT,
    "status" "StepStatus" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "approval_deadline" TIMESTAMP(3),
    "decision" "ApprovalDecision",
    "compensation_name" TEXT,

    CONSTRAINT "step_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "step_id" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "run_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "step_history_idempotency_key_key" ON "step_history"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "step_history_workflow_id_step_id_key" ON "step_history"("workflow_id", "step_id");

-- CreateIndex
CREATE INDEX "audit_log_workflow_id_idx" ON "audit_log"("workflow_id");

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");

-- AddForeignKey
ALTER TABLE "step_history" ADD CONSTRAINT "step_history_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workflow_id_step_id_fkey" FOREIGN KEY ("workflow_id", "step_id") REFERENCES "step_history"("workflow_id", "step_id") ON DELETE RESTRICT ON UPDATE CASCADE;
