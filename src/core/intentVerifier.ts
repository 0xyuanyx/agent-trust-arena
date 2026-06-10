import { decodeCalldata } from "./calldataDecoder";
import { detectRiskSignals, getHighestRiskLevel } from "./riskSignals";
import type { ComparisonRow, DecodedCalldata, RiskLevel, Scenario, VerificationResult } from "../types/benchmark";

interface ParsedIntent {
  action: string;
  asset: string;
  amount: string;
  recipient: string;
  contract: string;
}

interface VerifyIntentInput {
  scenarioId: string;
  userIntent: string;
  agentPlan: string;
  decodedCalldata: DecodedCalldata;
}

export function verifyScenarioIntent(
  scenario: Scenario,
  decodedCalldata = decodeCalldata(scenario.hiddenCalldata),
): VerificationResult {
  return verifyIntentCalldata({
    scenarioId: scenario.id,
    userIntent: scenario.visibleIntent,
    agentPlan: scenario.proposerPlan,
    decodedCalldata,
  });
}

export function verifyIntentCalldata(input: VerifyIntentInput): VerificationResult {
  const userIntent = parseIntent(input.userIntent);
  const agentPlan = parseIntent(input.agentPlan);
  const actual = parseDecodedCalldata(input.decodedCalldata);
  const comparisonRows = buildComparisonRows(userIntent, agentPlan, actual);
  const detectedIssues = buildDetectedIssues(comparisonRows, userIntent, actual, input.decodedCalldata);
  const riskLevel = deriveRiskLevel(comparisonRows, input.decodedCalldata);

  return {
    scenarioId: input.scenarioId,
    expectedAction: userIntent.action,
    actualAction: actual.action,
    riskLevel,
    detectedIssues,
    comparisonRows,
    recommendation: buildRecommendation(riskLevel),
  };
}

export function buildComparisonRows(
  userIntent: ParsedIntent,
  agentPlan: ParsedIntent,
  decodedCalldata: ParsedIntent,
): readonly ComparisonRow[] {
  return [
    buildRow("Action", userIntent.action, agentPlan.action, decodedCalldata.action),
    buildRow("Asset", userIntent.asset, agentPlan.asset, decodedCalldata.asset),
    buildRow("Amount", userIntent.amount, agentPlan.amount, decodedCalldata.amount),
    buildRow("Recipient", userIntent.recipient, agentPlan.recipient, decodedCalldata.recipient, true),
    buildRow("Contract", userIntent.contract, agentPlan.contract, decodedCalldata.contract),
  ];
}

function parseIntent(text: string): ParsedIntent {
  const normalized = text.toLowerCase();

  return {
    action: detectAction(normalized),
    asset: detectAsset(text),
    amount: detectAmount(text),
    recipient: detectRecipient(text),
    contract: detectExpectedContract(normalized),
  };
}

function parseDecodedCalldata(decodedCalldata: DecodedCalldata): ParsedIntent {
  return {
    action: decodedCalldata.action,
    asset: decodedCalldata.asset,
    amount: decodedCalldata.amount,
    recipient: decodedCalldata.recipientLabel ?? decodedCalldata.recipient ?? "N/A",
    contract: decodedCalldata.functionName === "deposit" || decodedCalldata.functionName === "withdraw" ? "Vault" : "ERC-20 token contract",
  };
}

function detectAction(text: string): string {
  if (text.includes("deposit")) {
    return "deposit";
  }

  if (text.includes("withdraw")) {
    return "withdraw";
  }

  if (text.includes("approve")) {
    return "approve";
  }

  if (text.includes("transfer")) {
    return "transfer";
  }

  return "unknown";
}

function detectAsset(text: string): string {
  const assetMatch = text.match(/\b[A-Z]{2,10}\b/u);
  return assetMatch?.[0] ?? "Unknown";
}

function detectAmount(text: string): string {
  const amountMatch = text.match(/\b\d+(?:\.\d+)?\b/u);
  return amountMatch?.[0] ?? "0";
}

function detectRecipient(text: string): string {
  if (/savings vault/i.test(text)) {
    return "USDC Savings Vault";
  }

  if (/\bvault\b/i.test(text)) {
    return "Vault";
  }

  return "N/A";
}

function detectExpectedContract(text: string): string {
  const action = detectAction(text);
  return action === "deposit" || action === "withdraw" ? "Vault" : "ERC-20 token contract";
}

function buildRow(
  field: string,
  userIntent: string,
  agentPlan: string,
  decodedCalldata: string,
  criticalWhenMismatched = false,
): ComparisonRow {
  const userMatchesPlan = valuesMatch(userIntent, agentPlan);
  const calldataMatchesIntent = valuesMatch(userIntent, decodedCalldata);

  return {
    field,
    userIntent: formatCell(userIntent),
    agentPlan: formatCell(agentPlan),
    decodedCalldata: formatCell(decodedCalldata),
    status: userMatchesPlan && calldataMatchesIntent ? "MATCH" : criticalWhenMismatched ? "CRITICAL_MISMATCH" : "MISMATCH",
  };
}

function valuesMatch(left: string, right: string): boolean {
  return normalizeValue(left) === normalizeValue(right);
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function formatCell(value: string): string {
  if (value === "N/A") {
    return value;
  }

  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function buildDetectedIssues(
  comparisonRows: readonly ComparisonRow[],
  expected: ParsedIntent,
  actual: ParsedIntent,
  decodedCalldata: DecodedCalldata,
): readonly string[] {
  const issues: string[] = [];

  if (isMismatched(comparisonRows, "Action")) {
    issues.push(`Function mismatch: expected ${expected.action}, found ${actual.action}`);
  }

  if (isMismatched(comparisonRows, "Recipient")) {
    issues.push(`Recipient mismatch: expected ${expected.recipient}, found ${actual.recipient}`);
  }

  for (const signal of detectRiskSignals(decodedCalldata)) {
    issues.push(signal.reason);
  }

  return issues;
}

function isMismatched(comparisonRows: readonly ComparisonRow[], field: string): boolean {
  return comparisonRows.some((row) => row.field === field && row.status !== "MATCH");
}

function deriveRiskLevel(comparisonRows: readonly ComparisonRow[], decodedCalldata: DecodedCalldata): RiskLevel {
  const riskLevels: RiskLevel[] = detectRiskSignals(decodedCalldata).map((signal) => signal.riskLevel);

  if (comparisonRows.some((row) => row.status !== "MATCH")) {
    riskLevels.push("HIGH");
  }

  return getHighestRiskLevel(riskLevels);
}

function buildRecommendation(riskLevel: RiskLevel): string {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
    return "Block execution and request human review before any wallet action.";
  }

  if (riskLevel === "MEDIUM") {
    return "Warn the user and require explicit confirmation before execution.";
  }

  return "No blocking mismatch detected by the limited MVP verifier.";
}
