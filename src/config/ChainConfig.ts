// ======================================================
// MINING TYCOON 3D
// ROBINHOOD CHAIN MAINNET CONFIG
// ======================================================

// ======================================================
// TREASURY
// ======================================================

export const TREASURY_ADDRESS =
  import.meta.env.VITE_TREASURY_ADDRESS ?? "";

// ======================================================
// ROBINHOOD CHAIN MAINNET
// ======================================================

export const ROBINHOOD_CHAIN = {
  name: "Robinhood Chain",

  chainId: 4663,

  // 4663 decimal = 0x1237
  chainIdHex: "0x1237",

  rpcUrl:
    "https://rpc.mainnet.chain.robinhood.com",

  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  blockExplorer:
    "https://robinhoodchain.blockscout.com",
} as const;

// ======================================================
// PAYMENT CURRENCY
// ======================================================

export const PAYMENT_CURRENCY =
  "ETH";

// ======================================================
// HARDWARE BASE PRICE
// ======================================================
//
// MODEL pricing:
//
// S1 = 0.0005 ETH
// S2 = 0.001 ETH
// S3 = 0.002 ETH
// S4 = 0.004 ETH
// S5 = 0.008 ETH
//
// Buying multiple units DOES NOT change their price.
// ======================================================

const BASE_HARDWARE_PRICE =
  0.0005;

// ======================================================
// TIER PRICE
// ======================================================

export function getTierPrice(
  tierIndex: number
): number {
  if (
    !Number.isInteger(tierIndex) ||
    tierIndex < 0
  ) {
    return BASE_HARDWARE_PRICE;
  }

  return (
    BASE_HARDWARE_PRICE *
    Math.pow(
      2,
      tierIndex
    )
  );
}

// ======================================================
// MINER PRICE
// ======================================================

export function getMinerEthPrice(
  minerIndex: number
): number {
  return getTierPrice(
    minerIndex
  );
}

// ======================================================
// RACK PRICE
// ======================================================

export function getRackEthPrice(
  rackIndex: number
): number {
  return getTierPrice(
    rackIndex
  );
}

// ======================================================
// POWER PRICE
// ======================================================

export function getPowerEthPrice(
  powerIndex: number
): number {
  return getTierPrice(
    powerIndex
  );
}

// ======================================================
// FORMAT ETH
// ======================================================

export function formatEthPrice(
  value: number
): string {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "0 ETH";
  }

  return `${value
    .toFixed(8)
    .replace(/0+$/, "")
    .replace(/\.$/, "")} ETH`;
}

// ======================================================
// TREASURY VALIDATION
// ======================================================

export function hasTreasuryAddress():
  boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(
    TREASURY_ADDRESS
  );
}

// ======================================================
// NETWORK CHECK
// ======================================================

export function isRobinhoodChain(
  chainId: number | null
): boolean {
  return (
    chainId ===
    ROBINHOOD_CHAIN.chainId
  );
}
