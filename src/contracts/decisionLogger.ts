export const decisionLoggerAbi = [
  {
    type: "event",
    name: "DecisionLogged",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "scenarioId", type: "bytes32", indexed: true },
      { name: "intentHash", type: "bytes32", indexed: false },
      { name: "planHash", type: "bytes32", indexed: false },
      { name: "calldataHash", type: "bytes32", indexed: false },
      { name: "verdict", type: "uint8", indexed: false },
      { name: "scoreDelta", type: "int16", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "logDecision",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "scenarioId", type: "bytes32" },
      { name: "intentHash", type: "bytes32" },
      { name: "planHash", type: "bytes32" },
      { name: "calldataHash", type: "bytes32" },
      { name: "verdict", type: "uint8" },
      { name: "scoreDelta", type: "int16" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [],
  },
] as const;

export const DecisionLoggerVerdict = {
  Approved: 0,
  Warned: 1,
  Blocked: 2,
  HumanReviewRequired: 3,
} as const;

export type DecisionLoggerVerdict =
  (typeof DecisionLoggerVerdict)[keyof typeof DecisionLoggerVerdict];

const configuredAddress = import.meta.env.VITE_DECISION_LOGGER_ADDRESS?.trim();

export const decisionLoggerAddress =
  configuredAddress && configuredAddress.length > 0 ? configuredAddress : undefined;
