import type { HardhatUserConfig } from "hardhat/config";

const mantleSepoliaPrivateKey = process.env.PRIVATE_KEY?.trim();

const config: HardhatUserConfig = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    mantleSepolia: {
      type: "http",
      chainType: "generic",
      chainId: 5003,
      url: "https://rpc.sepolia.mantle.xyz",
      accounts: mantleSepoliaPrivateKey ? [mantleSepoliaPrivateKey] : [],
    },
  },
};

export default config;
