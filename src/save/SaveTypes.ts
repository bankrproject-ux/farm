// ======================================================
// MINING TYCOON 3D
// PLAYER SAVE TYPES
// ======================================================
//
// This file defines the structure of player save data.
//
// Later:
// wallet address
//      ↓
// database
//      ↓
// PlayerSaveData
//      ↓
// restore entire facility
//
// ======================================================

// ======================================================
// VECTOR
// ======================================================

export type SavedPosition = {
  x: number;
  y: number;
  z: number;
};

// ======================================================
// SAVED MINER
// ======================================================

export type SavedMiner = {
  instanceId: string;

  definitionId: string;

  purchasedAt: number;

  powered: boolean;
};

// ======================================================
// SAVED RACK
// ======================================================

export type SavedRack = {
  instanceId: string;

  definitionId: string;

  purchasedAt: number;

  position: SavedPosition;

  rotationY: number;

  miners: SavedMiner[];
};

// ======================================================
// SAVED POWER SOURCE
// ======================================================

export type SavedPowerSource = {
  instanceId: string;

  definitionId: string;

  purchasedAt: number;

  position: SavedPosition;

  rotationY: number;

  enabled: boolean;
};

// ======================================================
// INVENTORY MINER
// ======================================================

export type SavedInventoryMiner = {
  instanceId: string;

  type: "miner";

  definitionId: string;

  purchasedAt: number;
};

// ======================================================
// INVENTORY RACK
// ======================================================

export type SavedInventoryRack = {
  instanceId: string;

  type: "rack";

  definitionId: string;

  purchasedAt: number;
};

// ======================================================
// INVENTORY POWER SOURCE
// ======================================================

export type SavedInventoryPowerSource = {
  instanceId: string;

  type: "power";

  definitionId: string;

  purchasedAt: number;
};

// ======================================================
// INVENTORY ITEM
// ======================================================

export type SavedInventoryItem =
  | SavedInventoryMiner
  | SavedInventoryRack
  | SavedInventoryPowerSource;

// ======================================================
// PLAYER SAVE
// ======================================================

export type PlayerSaveData = {
  // Save format version.
  //
  // Important later if we change the structure
  // of the game without deleting old player saves.

  version: number;

  // EVM wallet identity.

  walletAddress: string;

  // Player economy.

  balance: number;

  // Hardware not currently placed/installed.

  inventory: SavedInventoryItem[];

  // Placed racks and their installed miners.

  racks: SavedRack[];

  // Placed electrical infrastructure.

  powerSources: SavedPowerSource[];

  // Statistics.

  totalRevenue: number;

  // Save timestamps.

  createdAt: number;

  updatedAt: number;
};

// ======================================================
// CURRENT SAVE VERSION
// ======================================================

export const CURRENT_SAVE_VERSION =
  1;
