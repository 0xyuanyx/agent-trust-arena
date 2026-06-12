export type HexString = `0x${string}`;
export type Bytes32Hex = HexString;

// Keep these numeric values aligned with AgentDecisionLogger.Verdict.
export const Verdict = {
  Approved: 0,
  Warned: 1,
  Blocked: 2,
  HumanReviewRequired: 3,
} as const;

export type Verdict = (typeof Verdict)[keyof typeof Verdict];
export type VerdictName = keyof typeof Verdict;

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ScenarioStatus = "P0_READY" | "P1_READY" | "P1_PLACEHOLDER";
export type AgentStatus = "P0_READY" | "P1_READY" | "P1_PLACEHOLDER";

export interface AgentTrapExpectation {
  scenarioId: string;
  posture: "STRENGTH" | "NEUTRAL" | "WEAKNESS";
  proposerOutcome: string;
  auditorOutcome: string;
  expectedVerdict: Verdict;
  expectedScoreDelta: number;
}

export interface ScoreBreakdown {
  trapResistance: number;
  intentCalldataAlignment: number;
  walletPolicyCompliance: number;
  riskSignalDetection: number;
  decisionTransparency: number;
}

export interface AgentProfile {
  id: string;
  name: string;
  type: string;
  owner: string;
  network: string;
  mode: string;
  personality: string;
  strength: string;
  weakness: string;
  trapStrengths: readonly string[];
  trapWeaknesses: readonly string[];
  trapExpectations: readonly AgentTrapExpectation[];
  initialScore: number;
  testsCompleted: number;
  trapsSurvived: number;
  criticalFailures: number;
  status: AgentStatus;
  scoreBreakdown: ScoreBreakdown;
}

export interface CalldataArgument {
  name: string;
  type: string;
  value: string;
  label?: string;
}

export interface HiddenCalldata {
  transactionTo: HexString;
  contractLabel: string;
  calldata: HexString;
  selector: HexString;
  functionSignature: string;
  decodedArgs: readonly CalldataArgument[];
  summary: string;
}

export interface DecodedCalldata {
  rawCalldata: HexString;
  transactionTo: HexString;
  selector: HexString;
  contractLabel: string;
  functionName: string;
  functionSignature: string;
  action: string;
  asset: string;
  amount: string;
  amountRaw: string;
  decimals: number;
  recipient?: HexString;
  recipientLabel?: string;
  spender?: HexString;
  spenderLabel?: string;
}

export interface ComparisonRow {
  field: string;
  userIntent: string;
  agentPlan: string;
  decodedCalldata: string;
  status: "MATCH" | "MISMATCH" | "CRITICAL_MISMATCH";
}

export interface VerificationResult {
  scenarioId: string;
  expectedAction: string;
  actualAction: string;
  riskLevel: RiskLevel;
  detectedIssues: readonly string[];
  comparisonRows: readonly ComparisonRow[];
  recommendation: string;
}

export interface ScenarioMetadata {
  apr?: string;
  tvl?: string;
  contractVerification?: "verified" | "unverified" | "unknown";
  issuer?: string;
  withdrawalDelay?: string;
  notes?: readonly string[];
}

export interface Scenario {
  id: string;
  title: string;
  status: ScenarioStatus;
  difficulty: RiskLevel;
  severity: RiskLevel;
  cardSummary?: string;
  objective: string;
  visibleIntent: string;
  proposerPlan: string;
  hiddenCalldata: HiddenCalldata;
  expectedDecodedCalldata: DecodedCalldata;
  expectedVerification: VerificationResult;
  expectedSafeBehavior: string;
  failureCondition: string;
  metadata?: ScenarioMetadata;
  expectedVerdict: Verdict;
  expectedScoreDelta: number;
}

export interface Proposal {
  agentId: string;
  scenarioId: string;
  plan: string;
  targetContract: HexString;
  targetLabel: string;
  calldata: HexString;
  confidence: number;
}

export interface AuditResult {
  scenarioId: string;
  verdict: Verdict;
  riskLevel: RiskLevel;
  detectedIssues: readonly string[];
  vetoReason?: string;
  recommendation: string;
}

export interface ExecutionResult {
  scenarioId: string;
  status: "APPROVED" | "WARNED" | "BLOCKED" | "HUMAN_REVIEW_REQUIRED";
  transactionSubmitted: boolean;
  reason: string;
}

export interface ScoreResult {
  agentId: string;
  scenarioId: string;
  previousScore: number;
  scoreDelta: number;
  nextScore: number;
  status: string;
  reason: string;
}

export interface EvidencePayload {
  agentId: Bytes32Hex;
  scenarioId: Bytes32Hex;
  intentHash: Bytes32Hex;
  planHash: Bytes32Hex;
  calldataHash: Bytes32Hex;
  verdict: Verdict;
  scoreDelta: number;
  metadataURI: string;
}

export interface BenchmarkResult {
  agent: AgentProfile;
  scenario: Scenario;
  proposal: Proposal;
  decodedCalldata: DecodedCalldata;
  verification: VerificationResult;
  audit: AuditResult;
  execution: ExecutionResult;
  score: ScoreResult;
  evidence: EvidencePayload;
}
