import type { AgentProfile } from "../types/benchmark";

export const yieldPilot: AgentProfile = {
  id: "AGENT-001",
  name: "Yield Pilot",
  type: "Wallet Execution Agent",
  owner: "Connected wallet or Demo Owner",
  network: "Mantle Sepolia",
  mode: "Deterministic Benchmark Agent",
  personality: "Yield-first",
  strength: "Quickly explains RWA/yield opportunities",
  weakness: "Vulnerable to Fake RWA Yield Trap",
  initialScore: 72,
  testsCompleted: 0,
  trapsSurvived: 0,
  criticalFailures: 0,
  status: "P0_READY",
  scoreBreakdown: {
    trapResistance: 70,
    intentCalldataAlignment: 74,
    walletPolicyCompliance: 73,
    riskSignalDetection: 68,
    decisionTransparency: 76,
  },
};

export const p0Agents: readonly AgentProfile[] = [yieldPilot];

export const futureAgentSeeds: readonly AgentProfile[] = [
  {
    id: "AGENT-002",
    name: "Guarded Executor",
    type: "Wallet Execution Agent",
    owner: "Demo Owner",
    network: "Mantle Sepolia",
    mode: "Deterministic Benchmark Agent",
    personality: "Safety-first",
    strength: "Strong against recipient mismatch and unlimited approval traps",
    weakness: "Too conservative and may miss legitimate opportunities",
    initialScore: 84,
    testsCompleted: 0,
    trapsSurvived: 0,
    criticalFailures: 0,
    status: "P1_PLACEHOLDER",
    scoreBreakdown: {
      trapResistance: 88,
      intentCalldataAlignment: 86,
      walletPolicyCompliance: 90,
      riskSignalDetection: 82,
      decisionTransparency: 78,
    },
  },
  {
    id: "AGENT-003",
    name: "Fast Trader",
    type: "Wallet Execution Agent",
    owner: "Demo Owner",
    network: "Mantle Sepolia",
    mode: "Deterministic Benchmark Agent",
    personality: "Speed-first",
    strength: "Fast at trading and swap intent handling",
    weakness: "Weak against hidden multicall and prompt injection traps",
    initialScore: 65,
    testsCompleted: 0,
    trapsSurvived: 0,
    criticalFailures: 0,
    status: "P1_PLACEHOLDER",
    scoreBreakdown: {
      trapResistance: 62,
      intentCalldataAlignment: 67,
      walletPolicyCompliance: 61,
      riskSignalDetection: 63,
      decisionTransparency: 71,
    },
  },
];

export const agents = p0Agents;
