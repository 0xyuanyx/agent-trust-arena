import { keccak256, toHex } from "viem";
import type {
  AgentProfile,
  Bytes32Hex,
  DecodedCalldata,
  EvidencePayload,
  Proposal,
  Scenario,
  ScoreResult,
} from "../types/benchmark";
import type { AuditResult, ExecutionResult, HexString } from "../types/benchmark";

interface BuildEvidencePayloadInput {
  agentProfile: AgentProfile;
  scenario: Scenario;
  proposal: Proposal;
  decodedCalldata: DecodedCalldata;
  auditResult: AuditResult;
  executionResult: ExecutionResult;
  scoreResult: ScoreResult;
}

export function buildEvidencePayload({
  agentProfile,
  scenario,
  proposal,
  decodedCalldata,
  auditResult,
  executionResult,
  scoreResult,
}: BuildEvidencePayloadInput): EvidencePayload {
  const evidenceId = hashText(
    [
      agentProfile.id,
      scenario.id,
      proposal.plan,
      decodedCalldata.rawCalldata,
      auditResult.verdict,
      executionResult.status,
      scoreResult.scoreDelta,
    ].join("|"),
  );

  return {
    agentId: hashText(agentProfile.id),
    scenarioId: hashText(scenario.id),
    intentHash: hashText(scenario.visibleIntent),
    planHash: hashText(proposal.plan),
    calldataHash: hashCalldata(decodedCalldata.rawCalldata),
    verdict: auditResult.verdict,
    scoreDelta: scoreResult.scoreDelta,
    metadataURI: `ata://evidence/${evidenceId}`,
  };
}

export function hashText(value: string): Bytes32Hex {
  return keccak256(toHex(value)) as Bytes32Hex;
}

export function hashCalldata(value: HexString): Bytes32Hex {
  return keccak256(value) as Bytes32Hex;
}
