import type { AgentProfile, AgentTrapExpectation, Proposal, Scenario } from "../types/benchmark";

export function runProposerAgent(
  scenario: Scenario,
  agentProfile: AgentProfile,
): Proposal {
  const trapExpectation = getAgentTrapExpectation(agentProfile, scenario);

  return {
    agentId: agentProfile.id,
    scenarioId: scenario.id,
    plan: trapExpectation?.proposerOutcome ?? scenario.proposerPlan,
    targetContract: scenario.hiddenCalldata.transactionTo,
    targetLabel: scenario.hiddenCalldata.contractLabel,
    calldata: scenario.hiddenCalldata.calldata,
    confidence: getDeterministicConfidence(trapExpectation),
  };
}

export function getAgentTrapExpectation(
  agentProfile: AgentProfile,
  scenario: Scenario,
): AgentTrapExpectation | undefined {
  return agentProfile.trapExpectations.find(
    (expectation) => expectation.scenarioId === scenario.id,
  );
}

function getDeterministicConfidence(trapExpectation: AgentTrapExpectation | undefined) {
  if (trapExpectation?.posture === "STRENGTH") {
    return 0.91;
  }

  if (trapExpectation?.posture === "WEAKNESS") {
    return 0.66;
  }

  if (trapExpectation?.posture === "NEUTRAL") {
    return 0.82;
  }

  return 0.7;
}
