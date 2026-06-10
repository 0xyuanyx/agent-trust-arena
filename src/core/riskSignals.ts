import type { DecodedCalldata, RiskLevel } from "../types/benchmark";

export interface RiskSignal {
  id: "UNKNOWN_EOA_RECIPIENT" | "UNLIMITED_APPROVAL";
  riskLevel: RiskLevel;
  field: "recipient" | "amount";
  reason: string;
}

export const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export function detectRiskSignals(decodedCalldata: DecodedCalldata): readonly RiskSignal[] {
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

  return signals;
}

export function hasUnknownEoaRecipient(decodedCalldata: DecodedCalldata): boolean {
  return decodedCalldata.recipientLabel?.toLowerCase().includes("unknown eoa") ?? false;
}

export function hasUnlimitedApproval(decodedCalldata: DecodedCalldata): boolean {
  return decodedCalldata.functionName === "approve" && decodedCalldata.amountRaw === MAX_UINT256;
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
