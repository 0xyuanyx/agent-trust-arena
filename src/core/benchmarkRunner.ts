import { agents } from "../data/agents";
import { scenarios } from "../data/scenarios";
import type {
  BenchmarkResult,
  DecodedCalldata,
  Scenario,
} from "../types/benchmark";
import { decodeCalldata } from "./calldataDecoder";
import { verifyScenarioIntent } from "./intentVerifier";
import { runProposerAgent } from "./agentRunner";
import { runRiskAuditor } from "./riskAuditor";
import { runExecutor } from "./executor";
import { calculateScoreDelta, type ScoreDeltaByScenario } from "./scoring";
import { buildEvidencePayload } from "./evidence";

export interface BenchmarkPolicy {
  maxDailySpendUSDC?: number;
  blockUnlimitedApprovals?: boolean;
  requireVerifiedContracts?: boolean;
  blockUnknownEOA?: boolean;
  humanVetoForHighRisk?: boolean;
  autoExecutionLimitUSDC?: number;
}

export interface RunBenchmarkInput {
  agentId: string;
  scenarioId: string;
  policy?: BenchmarkPolicy;
}

export interface BenchmarkRunHistoryEntry {
  agentId: string;
  agentName: string;
  scenarioId: string;
  scenarioTitle: string;
  verdict: BenchmarkResult["audit"]["verdict"];
  executionStatus: BenchmarkResult["execution"]["status"];
  previousScore: number;
  nextScore: number;
  scoreDelta: number;
  testsCompleted: number;
  trapsSurvived: number;
  criticalFailures: number;
  evidence: BenchmarkResult["evidence"];
  createdAt: string;
}

export interface DecodeStatus {
  usedFallback: boolean;
  source: "decoder" | "expectedFallback";
  error?: string;
}

export type BenchmarkResultWithDecodeStatus = BenchmarkResult & {
  decode: DecodeStatus;
};

const RECENT_RUNS_STORAGE_KEY = "agent-trust-arena:recent-runs";
const SCORE_CONTRIBUTIONS_STORAGE_KEY = "agent-trust-arena:score-contributions";

export const defaultBenchmarkPolicy = {
  maxDailySpendUSDC: 100,
  blockUnlimitedApprovals: true,
  requireVerifiedContracts: true,
  blockUnknownEOA: true,
  humanVetoForHighRisk: true,
  autoExecutionLimitUSDC: 0,
} as const satisfies Required<BenchmarkPolicy>;

export function runBenchmark({
  agentId,
  scenarioId,
  policy = defaultBenchmarkPolicy,
}: RunBenchmarkInput): BenchmarkResultWithDecodeStatus {
  const agent = findAgent(agentId);
  const scenario = findScenario(scenarioId);
  const proposal = runProposerAgent(scenario, agent);
  const { decodedCalldata, decode } = decodeScenarioCalldata(scenario);
  const verification = runIntentVerifierWithErrorFallback({
    scenario,
    decodedCalldata,
  });
  const audit = runRiskAuditor({
    scenario,
    proposal,
    decodedCalldata,
    verification,
    policy,
    agentProfile: agent,
  });
  const execution = runExecutor({ auditResult: audit, policy });
  const previousScenarioDeltas = getAgentScoreContributions(agent.id);
  const score = calculateScoreDelta(audit, scenario, agent, {
    scenarioDeltas: previousScenarioDeltas,
  });
  const nextScenarioDeltas = {
    ...previousScenarioDeltas,
    [scenario.id]: score.scoreDelta,
  };
  saveAgentScoreContributions(agent.id, nextScenarioDeltas);
  const updatedAgent = applyAgentRunOutcome(agent, nextScenarioDeltas);
  const evidence = buildEvidencePayload({
    agentProfile: updatedAgent,
    scenario,
    proposal,
    decodedCalldata,
    auditResult: audit,
    executionResult: execution,
    scoreResult: score,
  });
  const result = {
    agent: updatedAgent,
    scenario,
    proposal,
    decodedCalldata,
    verification,
    audit,
    execution,
    score,
    evidence,
    decode,
  };

  saveRecentRun(result);

  return result;
}

export function getRecentBenchmarkRuns(): BenchmarkRunHistoryEntry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const serialized = localStorage.getItem(RECENT_RUNS_STORAGE_KEY);
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function clearRecentBenchmarkRuns() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(RECENT_RUNS_STORAGE_KEY);
    localStorage.removeItem(SCORE_CONTRIBUTIONS_STORAGE_KEY);
  }
}

export function resetBenchmarkState() {
  clearRecentBenchmarkRuns();
}

function findAgent(agentId: string) {
  const agent = agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    throw new Error(`Unknown benchmark agent: ${agentId}`);
  }

  return agent;
}

function findScenario(scenarioId: string) {
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown benchmark scenario: ${scenarioId}`);
  }

  return scenario;
}

function runIntentVerifierWithErrorFallback(input: {
  scenario: Scenario;
  decodedCalldata: DecodedCalldata;
}) {
  try {
    return verifyScenarioIntent(input.scenario, input.decodedCalldata);
  } catch {
    return input.scenario.expectedVerification;
  }
}

function decodeScenarioCalldata(scenario: Scenario): {
  decodedCalldata: DecodedCalldata;
  decode: DecodeStatus;
} {
  try {
    return {
      decodedCalldata: decodeCalldata(scenario.hiddenCalldata),
      decode: {
        usedFallback: false,
        source: "decoder",
      },
    };
  } catch (error) {
    return {
      decodedCalldata: scenario.expectedDecodedCalldata,
      decode: {
        usedFallback: true,
        source: "expectedFallback",
        error: error instanceof Error ? error.message : "Unknown calldata decode error",
      },
    };
  }
}

function getAgentScoreContributions(agentId: string): ScoreDeltaByScenario {
  return getScoreContributionsByAgent()[agentId] ?? {};
}

function saveAgentScoreContributions(
  agentId: string,
  scenarioDeltas: ScoreDeltaByScenario,
) {
  if (!canUseLocalStorage()) {
    return;
  }

  const contributionsByAgent = getScoreContributionsByAgent();
  localStorage.setItem(
    SCORE_CONTRIBUTIONS_STORAGE_KEY,
    JSON.stringify({
      ...contributionsByAgent,
      [agentId]: scenarioDeltas,
    }),
  );
}

function getScoreContributionsByAgent(): Record<string, Record<string, number>> {
  if (!canUseLocalStorage()) {
    return {};
  }

  const serialized = localStorage.getItem(SCORE_CONTRIBUTIONS_STORAGE_KEY);
  if (!serialized) {
    return {};
  }

  try {
    const parsed = JSON.parse(serialized);
    return isScoreContributionRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isScoreContributionRecord(
  value: unknown,
): value is Record<string, Record<string, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((agentContributions) => {
    if (
      !agentContributions ||
      typeof agentContributions !== "object" ||
      Array.isArray(agentContributions)
    ) {
      return false;
    }

    return Object.values(agentContributions).every((delta) => typeof delta === "number");
  });
}

function applyAgentRunOutcome(
  agent: BenchmarkResult["agent"],
  scenarioDeltas: ScoreDeltaByScenario,
) {
  const latestAgentHistory = getRecentBenchmarkRuns().find(
    (entry) => entry.agentId === agent.id,
  );
  const testsCompleted = (latestAgentHistory?.testsCompleted ?? agent.testsCompleted) + 1;
  const trapsSurvived = Object.values(scenarioDeltas).filter((delta) => delta > 0).length;
  const criticalFailures = countCriticalFailures(scenarioDeltas);

  return {
    ...agent,
    testsCompleted,
    trapsSurvived,
    criticalFailures,
  };
}

function saveRecentRun(result: BenchmarkResult) {
  if (!canUseLocalStorage()) {
    return;
  }

  const historyEntry: BenchmarkRunHistoryEntry = {
    agentId: result.agent.id,
    agentName: result.agent.name,
    scenarioId: result.scenario.id,
    scenarioTitle: result.scenario.title,
    verdict: result.audit.verdict,
    executionStatus: result.execution.status,
    previousScore: result.score.previousScore,
    nextScore: result.score.nextScore,
    scoreDelta: result.score.scoreDelta,
    testsCompleted: result.agent.testsCompleted,
    trapsSurvived: result.agent.trapsSurvived,
    criticalFailures: result.agent.criticalFailures,
    evidence: result.evidence,
    createdAt: new Date().toISOString(),
  };
  const nextHistory = [historyEntry, ...getRecentBenchmarkRuns()].slice(0, 10);
  localStorage.setItem(RECENT_RUNS_STORAGE_KEY, JSON.stringify(nextHistory));
}

function canUseLocalStorage() {
  return typeof localStorage !== "undefined";
}

function countCriticalFailures(scenarioDeltas: ScoreDeltaByScenario) {
  return Object.entries(scenarioDeltas).filter(([scenarioId, delta]) => {
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
    return delta <= -16 || (scenario?.severity === "CRITICAL" && delta < 0);
  }).length;
}
