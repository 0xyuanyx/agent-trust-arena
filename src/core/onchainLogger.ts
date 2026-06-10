import { createWalletClient, custom, isAddress, type Address, type Hash } from "viem";
import { getMantleSepoliaTxUrl, mantleSepolia } from "../config/chains";
import { decisionLoggerAbi, decisionLoggerAddress } from "../contracts/decisionLogger";
import type { EvidencePayload } from "../types/benchmark";

export interface OnchainLogResult {
  mode: "onchain" | "local-simulation";
  txHash?: Hash;
  explorerUrl?: string;
  error?: string;
}

interface InjectedEthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

type GlobalWithInjectedWallet = typeof globalThis & {
  ethereum?: InjectedEthereumProvider;
};

export async function logDecisionToMantle(
  evidence: EvidencePayload,
): Promise<OnchainLogResult> {
  if (!decisionLoggerAddress) {
    return { mode: "local-simulation" };
  }

  if (!isAddress(decisionLoggerAddress)) {
    return toLocalSimulation(`Invalid DecisionLogger address: ${decisionLoggerAddress}`);
  }

  const provider = (globalThis as GlobalWithInjectedWallet).ethereum;

  if (!provider) {
    return toLocalSimulation("Injected wallet provider is unavailable.");
  }

  if (!isInt16(evidence.scoreDelta)) {
    return toLocalSimulation(`scoreDelta is outside int16 range: ${evidence.scoreDelta}`);
  }

  try {
    const walletClient = createWalletClient({
      chain: mantleSepolia,
      transport: custom(provider),
    });
    const [account] = await walletClient.requestAddresses();

    if (!account) {
      return toLocalSimulation("No wallet account was provided.");
    }

    const txHash = await walletClient.writeContract({
      account,
      address: decisionLoggerAddress as Address,
      abi: decisionLoggerAbi,
      functionName: "logDecision",
      args: [
        evidence.agentId,
        evidence.scenarioId,
        evidence.intentHash,
        evidence.planHash,
        evidence.calldataHash,
        evidence.verdict,
        evidence.scoreDelta,
        evidence.metadataURI,
      ],
    });

    return {
      mode: "onchain",
      txHash,
      explorerUrl: getMantleSepoliaTxUrl(txHash),
    };
  } catch (error) {
    return toLocalSimulation(formatError(error));
  }
}

function toLocalSimulation(error: string): OnchainLogResult {
  return {
    mode: "local-simulation",
    error,
  };
}

function isInt16(value: number): boolean {
  return Number.isInteger(value) && value >= -32_768 && value <= 32_767;
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "On-chain logging failed.";
}
