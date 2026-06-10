import { decodeAbiParameters, formatUnits } from "viem";
import type { DecodedCalldata, HexString, HiddenCalldata } from "../types/benchmark";

type SupportedFunctionName = "transfer" | "approve" | "transferFrom" | "deposit" | "withdraw";

interface DecodeInput {
  transactionTo: HexString;
  calldata: HexString;
  contractLabel?: string;
  asset?: string;
  decimals?: number;
  recipientLabels?: Partial<Record<HexString, string>>;
}

interface FunctionMetadata {
  selector: HexString;
  functionName: SupportedFunctionName;
  functionSignature: string;
  action: string;
  contractKind: "TOKEN" | "VAULT";
}

export const SUPPORTED_SELECTORS: Record<HexString, FunctionMetadata> = {
  "0xa9059cbb": {
    selector: "0xa9059cbb",
    functionName: "transfer",
    functionSignature: "transfer(address,uint256)",
    action: "transfer",
    contractKind: "TOKEN",
  },
  "0x095ea7b3": {
    selector: "0x095ea7b3",
    functionName: "approve",
    functionSignature: "approve(address,uint256)",
    action: "approve",
    contractKind: "TOKEN",
  },
  "0x23b872dd": {
    selector: "0x23b872dd",
    functionName: "transferFrom",
    functionSignature: "transferFrom(address,address,uint256)",
    action: "transfer",
    contractKind: "TOKEN",
  },
  "0xb6b55f25": {
    selector: "0xb6b55f25",
    functionName: "deposit",
    functionSignature: "deposit(uint256)",
    action: "deposit",
    contractKind: "VAULT",
  },
  "0x2e1a7d4d": {
    selector: "0x2e1a7d4d",
    functionName: "withdraw",
    functionSignature: "withdraw(uint256)",
    action: "withdraw",
    contractKind: "VAULT",
  },
};

const DEFAULT_TOKEN_DECIMALS = 18;
const USDC_DECIMALS = 6;

export function decodeCalldata(input: HiddenCalldata | DecodeInput): DecodedCalldata {
  const normalizedInput = normalizeDecodeInput(input);
  const selector = getSelector(normalizedInput.calldata);
  const metadata = SUPPORTED_SELECTORS[selector];

  if (!metadata) {
    return buildUnknownDecodedCalldata(normalizedInput, selector);
  }

  const encodedArgs = getEncodedArgs(normalizedInput.calldata);
  const decimals = normalizedInput.decimals ?? inferDecimals(normalizedInput);
  const asset = normalizedInput.asset ?? inferAsset(normalizedInput);

  if (metadata.functionName === "transfer") {
    const [to, value] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }], encodedArgs);
    return buildDecodedCalldata(normalizedInput, metadata, asset, decimals, value, normalizeAddress(to));
  }

  if (metadata.functionName === "approve") {
    const [spender, value] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }], encodedArgs);
    return buildDecodedCalldata(normalizedInput, metadata, asset, decimals, value, normalizeAddress(spender));
  }

  if (metadata.functionName === "transferFrom") {
    const [, to, value] = decodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      encodedArgs,
    );
    return buildDecodedCalldata(normalizedInput, metadata, asset, decimals, value, normalizeAddress(to));
  }

  const [value] = decodeAbiParameters([{ type: "uint256" }], encodedArgs);
  return buildDecodedCalldata(normalizedInput, metadata, asset, decimals, value);
}

export function getSelector(calldata: HexString): HexString {
  if (calldata.length < 10) {
    return "0x";
  }

  return calldata.slice(0, 10).toLowerCase() as HexString;
}

function normalizeDecodeInput(input: HiddenCalldata | DecodeInput): DecodeInput {
  const base: DecodeInput = {
    transactionTo: input.transactionTo,
    calldata: input.calldata,
    contractLabel: input.contractLabel,
  };

  if ("decodedArgs" in input) {
    return {
      ...base,
      recipientLabels: Object.fromEntries(
        input.decodedArgs
          .filter((arg) => arg.type === "address" && arg.label)
          .map((arg) => [normalizeAddress(arg.value as HexString), arg.label]),
      ) as Partial<Record<HexString, string>>,
    };
  }

  return input;
}

function buildDecodedCalldata(
  input: DecodeInput,
  metadata: FunctionMetadata,
  asset: string,
  decimals: number,
  value: bigint,
  recipient?: HexString,
): DecodedCalldata {
  const amountRaw = value.toString();

  return {
    rawCalldata: input.calldata,
    transactionTo: normalizeAddress(input.transactionTo),
    selector: metadata.selector,
    contractLabel: input.contractLabel ?? inferContractLabel(metadata),
    functionName: metadata.functionName,
    functionSignature: metadata.functionSignature,
    action: metadata.action,
    asset,
    amount: formatUnits(value, decimals),
    amountRaw,
    decimals,
    recipient,
    recipientLabel: recipient ? input.recipientLabels?.[recipient] : undefined,
  };
}

function buildUnknownDecodedCalldata(input: DecodeInput, selector: HexString): DecodedCalldata {
  return {
    rawCalldata: input.calldata,
    transactionTo: normalizeAddress(input.transactionTo),
    selector,
    contractLabel: input.contractLabel ?? "Unknown contract",
    functionName: "unknown",
    functionSignature: "unknown",
    action: "unknown",
    asset: input.asset ?? "Unknown",
    amount: "0",
    amountRaw: "0",
    decimals: input.decimals ?? 0,
  };
}

function getEncodedArgs(calldata: HexString): HexString {
  return `0x${calldata.slice(10)}` as HexString;
}

function normalizeAddress(address: HexString): HexString {
  return address.toLowerCase() as HexString;
}

function inferAsset(input: DecodeInput): string {
  const label = input.contractLabel?.toLowerCase() ?? "";

  if (label.includes("usdc")) {
    return "USDC";
  }

  return "Token";
}

function inferDecimals(input: DecodeInput): number {
  return inferAsset(input) === "USDC" ? USDC_DECIMALS : DEFAULT_TOKEN_DECIMALS;
}

function inferContractLabel(metadata: FunctionMetadata): string {
  return metadata.contractKind === "VAULT" ? "Mock vault contract" : "ERC-20 token contract";
}
