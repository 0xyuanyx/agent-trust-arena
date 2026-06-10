import hre from "hardhat";

type JsonRpcProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type NetworkWithProvider = {
  provider: JsonRpcProvider;
};

type NetworkConnector = {
  connect?: () => Promise<NetworkWithProvider>;
  provider?: JsonRpcProvider;
};

type TransactionReceipt = {
  contractAddress: string | null;
  status: string;
  transactionHash: string;
};

const explorerBaseUrl = "https://sepolia.mantlescan.xyz";

async function getProvider(): Promise<JsonRpcProvider> {
  const hardhatNetwork = hre.network as unknown as NetworkConnector;

  if (hardhatNetwork.connect) {
    const connection = await hardhatNetwork.connect();
    return connection.provider;
  }

  if (hardhatNetwork.provider) {
    return hardhatNetwork.provider;
  }

  throw new Error("Hardhat network provider is unavailable.");
}

async function waitForReceipt(
  provider: JsonRpcProvider,
  txHash: string,
): Promise<TransactionReceipt> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as TransactionReceipt | null;

    if (receipt) {
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Timed out waiting for deployment receipt: ${txHash}`);
}

async function main() {
  const provider = await getProvider();
  const artifact = await hre.artifacts.readArtifact("AgentDecisionLogger");
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  if (!accounts.length) {
    throw new Error("No deployer account configured. Set PRIVATE_KEY before deploying.");
  }

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: accounts[0],
        data: artifact.bytecode,
      },
    ],
  })) as string;

  console.log(`Deployment transaction: ${txHash}`);
  console.log(`${explorerBaseUrl}/tx/${txHash}`);

  const receipt = await waitForReceipt(provider, txHash);

  if (!receipt.contractAddress) {
    throw new Error(`Deployment receipt did not include a contract address: ${txHash}`);
  }

  console.log(`AgentDecisionLogger deployed to: ${receipt.contractAddress}`);
  console.log(`${explorerBaseUrl}/address/${receipt.contractAddress}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
