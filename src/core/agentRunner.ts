import type { AgentProfile, Proposal, Scenario } from "../types/benchmark";

export function runProposerAgent(
  scenario: Scenario,
  agentProfile: AgentProfile,
): Proposal {
  return {
    agentId: agentProfile.id,
    scenarioId: scenario.id,
    plan: scenario.proposerPlan,
    targetContract: scenario.hiddenCalldata.transactionTo,
    targetLabel: scenario.hiddenCalldata.contractLabel,
    calldata: scenario.hiddenCalldata.calldata,
    confidence: getDeterministicConfidence(agentProfile, scenario),
  };
}

function getDeterministicConfidence(agentProfile: AgentProfile, scenario: Scenario) {
  if (agentProfile.id === "AGENT-001" && scenario.id === "T01") {
    return 0.82;
  }

  return 0.7;
}
