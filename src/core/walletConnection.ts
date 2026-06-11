import { isAddress, type Address } from "viem";
import { MANTLE_SEPOLIA_CHAIN_ID } from "../config/chains";

export interface ConnectWalletResult {
  address?: Address;
  error?: string;
}

export interface WalletState {
  connected: boolean;
  address?: Address;
  chainId?: number;
  isMantleSepolia: boolean;
}

export type WalletChangeCallback = (state: WalletState) => void;

interface InjectedEthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: "accountsChanged" | "chainChanged", listener: () => void) => void;
  removeListener?: (
    event: "accountsChanged" | "chainChanged",
    listener: () => void,
  ) => void;
}

type GlobalWithInjectedWallet = typeof globalThis & {
  ethereum?: InjectedEthereumProvider;
};

const disconnectedWalletState: WalletState = {
  connected: false,
  isMantleSepolia: false,
};

export async function connectWallet(): Promise<ConnectWalletResult> {
  const provider = getInjectedProvider();

  if (!provider) {
    return { error: "Injected wallet provider is unavailable." };
  }

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = getFirstValidAddress(accounts);

    if (!address) {
      return { error: "No wallet account was provided." };
    }

    return { address };
  } catch (error) {
    return { error: formatError(error) };
  }
}

export async function getWalletState(): Promise<WalletState> {
  const provider = getInjectedProvider();

  if (!provider) {
    return disconnectedWalletState;
  }

  const [accounts, chainIdValue] = await Promise.all([
    safeRequest(provider, "eth_accounts"),
    safeRequest(provider, "eth_chainId"),
  ]);
  const address = getFirstValidAddress(accounts);
  const chainId = normalizeChainId(chainIdValue);

  return {
    connected: Boolean(address),
    address,
    chainId,
    isMantleSepolia: chainId === MANTLE_SEPOLIA_CHAIN_ID,
  };
}

export function onWalletChange(callback: WalletChangeCallback): () => void {
  const provider = getInjectedProvider();

  if (!provider?.on) {
    return () => {};
  }

  const emitState = () => {
    void getWalletState().then(callback);
  };

  provider.on("accountsChanged", emitState);
  provider.on("chainChanged", emitState);

  return () => {
    provider.removeListener?.("accountsChanged", emitState);
    provider.removeListener?.("chainChanged", emitState);
  };
}

function getInjectedProvider(): InjectedEthereumProvider | undefined {
  return (globalThis as GlobalWithInjectedWallet).ethereum;
}

async function safeRequest(
  provider: InjectedEthereumProvider,
  method: string,
): Promise<unknown> {
  try {
    return await provider.request({ method });
  } catch {
    return undefined;
  }
}

function getFirstValidAddress(value: unknown): Address | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const [address] = value;
  return typeof address === "string" && isAddress(address) ? address : undefined;
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

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Wallet connection failed.";
}
