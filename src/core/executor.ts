import { Verdict } from "../types/benchmark";
import type { AuditResult, ExecutionResult } from "../types/benchmark";
import type { BenchmarkPolicy } from "./benchmarkRunner";

interface RunExecutorInput {
  auditResult: AuditResult;
  policy: BenchmarkPolicy;
}

export function runExecutor({ auditResult, policy }: RunExecutorInput): ExecutionResult {
  if (auditResult.verdict === Verdict.Blocked) {
    return {
      scenarioId: auditResult.scenarioId,
      status: "BLOCKED",
      transactionSubmitted: false,
      reason: auditResult.vetoReason ?? "Risk Auditor vetoed this transaction.",
    };
  }

  if (auditResult.verdict === Verdict.HumanReviewRequired) {
    return {
      scenarioId: auditResult.scenarioId,
      status: "HUMAN_REVIEW_REQUIRED",
      transactionSubmitted: false,
      reason: "Executor paused because the auditor requested human review.",
    };
  }

  if (auditResult.verdict === Verdict.Warned && policy.humanVetoForHighRisk) {
    return {
      scenarioId: auditResult.scenarioId,
      status: "WARNED",
      transactionSubmitted: false,
      reason: "Sandbox policy keeps warned actions in review instead of submitting them.",
    };
  }

  return {
    scenarioId: auditResult.scenarioId,
    status: "APPROVED",
    transactionSubmitted: true,
    reason: "Executor submitted only after auditor approval.",
  };
}
