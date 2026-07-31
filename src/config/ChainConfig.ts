// ======================================================
// MINING TYCOON 3D
// BLOCKCHAIN CONFIGURATION
// ======================================================
//
// Public blockchain configuration only.
//
// IMPORTANT:
//
// NEVER put:
// - private keys
// - seed phrases
// - treasury private key
//
// inside this file.
//
// Treasury ADDRESS is public and safe to expose.
// ======================================================

// ======================================================
// TREASURY
// ======================================================
//
// ETH payments from hardware purchases will be sent
// to this address.
//
// We use a Vite environment variable so the receiving
// address can be changed without changing shop logic.
//
// Vercel environment variable:
//
// VITE_TREASURY_ADDRESS
//
// Example:
//
// 0x1234567890abcdef1234567890abcdef12345678
//
// ======================================================

export const TREASURY_ADDRESS =
  import.meta.env
    .VITE_TREASURY_ADDRESS ??
  "";

// ======================================================
// ROBINHOOD CHAIN
// ======================================================
//
// We will fill the exact chain configuration once the
// purchase transaction system is connected.
//
// Keeping it centralized prevents chain IDs / RPC
// configuration from being scattered throughout
// the game.
// ======================================================

export const PAYMENT_CURRENCY =
  "ETH";

// ======================================================
// HARDWARE ETH PRICES
// ======================================================
//
// Prices are based on hardware MODEL/TIER.
//
// Buying multiple copies does NOT increase the price.
//
// Miner example:
//
// BitForge S1 = 0.0005 ETH
// BitForge S2 = 0.0010 ETH
// BitForge S3 = 0.0020 ETH
// BitForge S4 = 0.0040 ETH
//
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
    !Number.isInteger(
      tierIndex
    ) ||
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

  return `${value.toFixed(
    8
  )
    .replace(
      /0+$/,
      ""
    )
    .replace(
      /\.$/,
      ""
    )} ETH`;
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
