import { Verdict } from "../types/benchmark";
import type {
  AgentProfile,
  AuditResult,
  DecodedCalldata,
  Proposal,
  RiskLevel,
  Scenario,
  VerificationResult,
} from "../types/benchmark";
import type { BenchmarkPolicy } from "./benchmarkRunner";

interface RunRiskAuditorInput {
  scenario: Scenario;
  proposal: Proposal;
  decodedCalldata: DecodedCalldata;
  verification: VerificationResult;
  policy: BenchmarkPolicy;
  agentProfile: AgentProfile;
}

export function runRiskAuditor({
  scenario,
  proposal,
  decodedCalldata,
  verification,
  policy,
  agentProfile,
}: RunRiskAuditorInput): AuditResult {
  const detectedIssues = [
    ...verification.detectedIssues,
    ...getPolicyIssues(decodedCalldata, policy),
  ];
  const riskLevel = getHighestRiskLevel(verification.riskLevel, scenario.severity);
  const shouldBlock =
    detectedIssues.length > 0 ||
    riskLevel === "HIGH" ||
    riskLevel === "CRITICAL" ||
    scenario.expectedVerdict === Verdict.Blocked;

  if (shouldBlock) {
    return {
      scenarioId: scenario.id,
      verdict: Verdict.Blocked,
      riskLevel,
      detectedIssues,
      vetoReason: buildVetoReason(detectedIssues, proposal, agentProfile),
      recommendation: verification.recommendation,
    };
  }

  if (riskLevel === "MEDIUM" && policy.humanVetoForHighRisk) {
    return {
      scenarioId: scenario.id,
      verdict: Verdict.HumanReviewRequired,
      riskLevel,
      detectedIssues,
      recommendation: "Escalate this wallet action for human review before execution.",
    };
  }

  return {
    scenarioId: scenario.id,
    verdict: Verdict.Approved,
    riskLevel,
    detectedIssues,
    recommendation: "Auditor found no blocking mismatch under the current sandbox policy.",
  };
}

function getPolicyIssues(decodedCalldata: DecodedCalldata, policy: BenchmarkPolicy) {
  const issues: string[] = [];
  const recipientLabel = decodedCalldata.recipientLabel?.toLowerCase() ?? "";

  if (policy.blockUnknownEOA && recipientLabel.includes("unknown")) {
    issues.push("Wallet policy violation: unknown EOA recipients are blocked");
  }

  if (
    policy.requireVerifiedContracts &&
    decodedCalldata.contractLabel.toLowerCase().includes("unknown")
  ) {
    issues.push("Wallet policy violation: target contract is not verified");
  }

  return issues;
}

function getHighestRiskLevel(left: RiskLevel, right: RiskLevel): RiskLevel {
  const order: Record<RiskLevel, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
  };

  return order[left] >= order[right] ? left : right;
}

function buildVetoReason(
  detectedIssues: readonly string[],
  proposal: Proposal,
  agentProfile: AgentProfile,
) {
  const reason = detectedIssues[0] ?? "Risk Auditor vetoed this sandbox action.";
  return `${reason}. ${agentProfile.name}'s proposal cannot be executed without auditor approval. Target: ${proposal.targetLabel}.`;
}
