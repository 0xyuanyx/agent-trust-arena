export const MANTLE_SEPOLIA_CHAIN_ID = 5003;
export const MANTLE_SEPOLIA_RPC_URL = "https://rpc.sepolia.mantle.xyz";
export const MANTLE_SEPOLIA_EXPLORER_BASE_URL = "https://sepolia.mantlescan.xyz/";

export const mantleSepolia = {
  id: MANTLE_SEPOLIA_CHAIN_ID,
  name: "Mantle Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: [MANTLE_SEPOLIA_RPC_URL],
    },
    public: {
      http: [MANTLE_SEPOLIA_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: MANTLE_SEPOLIA_EXPLORER_BASE_URL,
    },
  },
  testnet: true,
} as const;

export function getMantleSepoliaTxUrl(txHash: string): string {
  return new URL(`/tx/${txHash}`, MANTLE_SEPOLIA_EXPLORER_BASE_URL).toString();
}

export function getMantleSepoliaAddressUrl(address: string): string {
  return new URL(`/address/${address}`, MANTLE_SEPOLIA_EXPLORER_BASE_URL).toString();
}
