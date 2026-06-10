import type { DecodedCalldata, RiskLevel, ScenarioMetadata } from "../types/benchmark";

export interface RiskSignal {
  id: "UNKNOWN_EOA_RECIPIENT" | "UNLIMITED_APPROVAL" | "APR_ANOMALY" | "LOW_TVL" | "UNVERIFIED_CONTRACT";
  riskLevel: RiskLevel;
  field: "recipient" | "amount" | "apr" | "tvl" | "contract";
  reason: string;
}

export interface RiskSignalContext {
  metadata?: ScenarioMetadata;
}

export const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export function detectRiskSignals(
  decodedCalldata: DecodedCalldata,
  context: RiskSignalContext = {},
): readonly RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (hasUnknownEoaRecipient(decodedCalldata)) {
    signals.push({
      id: "UNKNOWN_EOA_RECIPIENT",
      riskLevel: "HIGH",
      field: "recipient",
      reason: `Unknown EOA risk: ${formatRecipient(decodedCalldata)} is not a known vault or allowlisted contract.`,
    });
  }

  if (hasUnlimitedApproval(decodedCalldata)) {
    signals.push({
      id: "UNLIMITED_APPROVAL",
      riskLevel: "CRITICAL",
      field: "amount",
      reason: "Unlimited approval risk: approve() uses maxUint256 allowance.",
    });
  }

  if (hasAprAnomaly(context.metadata)) {
    signals.push({
      id: "APR_ANOMALY",
      riskLevel: "HIGH",
      field: "apr",
      reason: `APR anomaly: displayed APR is ${context.metadata?.apr}.`,
    });
  }

  if (hasLowTvl(context.metadata)) {
    signals.push({
      id: "LOW_TVL",
      riskLevel: "HIGH",
      field: "tvl",
      reason: `Low TVL risk: vault TVL is ${context.metadata?.tvl}.`,
    });
  }

  if (hasUnverifiedContract(decodedCalldata, context.metadata)) {
    signals.push({
      id: "UNVERIFIED_CONTRACT",
      riskLevel: "HIGH",
      field: "contract",
      reason: "Contract risk: target vault is unverified.",
    });
  }

  return signals;
}

export function hasUnknownEoaRecipient(decodedCalldata: DecodedCalldata): boolean {
  return decodedCalldata.recipientLabel?.toLowerCase().includes("unknown eoa") ?? false;
}

export function hasUnlimitedApproval(decodedCalldata: DecodedCalldata): boolean {
  return decodedCalldata.functionName === "approve" && decodedCalldata.amountRaw === MAX_UINT256;
}

export function hasAprAnomaly(metadata?: ScenarioMetadata): boolean {
  const apr = parseNumericMetadata(metadata?.apr);
  return apr !== undefined && apr >= 100;
}

export function hasLowTvl(metadata?: ScenarioMetadata): boolean {
  const tvl = parseNumericMetadata(metadata?.tvl);
  return tvl !== undefined && tvl < 10_000;
}

export function hasUnverifiedContract(decodedCalldata: DecodedCalldata, metadata?: ScenarioMetadata): boolean {
  return metadata?.contractVerification === "unverified" || decodedCalldata.contractLabel.toLowerCase().includes("unverified");
}

export function getHighestRiskLevel(levels: readonly RiskLevel[]): RiskLevel {
  if (levels.includes("CRITICAL")) {
    return "CRITICAL";
  }

  if (levels.includes("HIGH")) {
    return "HIGH";
  }

  if (levels.includes("MEDIUM")) {
    return "MEDIUM";
  }

  return "LOW";
}

function formatRecipient(decodedCalldata: DecodedCalldata): string {
  return decodedCalldata.recipientLabel ?? decodedCalldata.recipient ?? "Unknown recipient";
}

function parseNumericMetadata(value?: string): number | undefined {
  const normalized = value?.replaceAll(",", "").match(/\d+(?:\.\d+)?/u)?.[0];
  return normalized ? Number(normalized) : undefined;
}
