import { createWalletClient, custom, isAddress, type Address, type Hash } from "viem";
import {
  MANTLE_SEPOLIA_CHAIN_ID,
  MANTLE_SEPOLIA_EXPLORER_BASE_URL,
  MANTLE_SEPOLIA_RPC_URL,
  getMantleSepoliaTxUrl,
  mantleSepolia,
} from "../config/chains";
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
    await ensureMantleSepolia(provider);

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

async function ensureMantleSepolia(provider: InjectedEthereumProvider): Promise<void> {
  const currentChainId = await provider.request({ method: "eth_chainId" });
  const mantleSepoliaChainId = toEip1193ChainId(MANTLE_SEPOLIA_CHAIN_ID);

  if (normalizeChainId(currentChainId) === MANTLE_SEPOLIA_CHAIN_ID) {
    return;
  }

  try {
    await switchToMantleSepolia(provider, mantleSepoliaChainId);
  } catch (error) {
    if (getErrorCode(error) !== 4902) {
      throw error;
    }

    await addMantleSepolia(provider, mantleSepoliaChainId);
    await switchToMantleSepolia(provider, mantleSepoliaChainId);
  }
}

async function switchToMantleSepolia(
  provider: InjectedEthereumProvider,
  chainId: string,
): Promise<void> {
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId }],
  });
}

async function addMantleSepolia(
  provider: InjectedEthereumProvider,
  chainId: string,
): Promise<void> {
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId,
        chainName: mantleSepolia.name,
        nativeCurrency: mantleSepolia.nativeCurrency,
        rpcUrls: [MANTLE_SEPOLIA_RPC_URL],
        blockExplorerUrls: [MANTLE_SEPOLIA_EXPLORER_BASE_URL],
      },
    ],
  });
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

function toEip1193ChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

function normalizeChainId(value: unknown): number | undefined {
  if (typeof value === "string") {
    return value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  return undefined;
}

function getErrorCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "number" ? maybeCode : undefined;
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
