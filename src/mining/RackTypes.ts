import type {
  MinerDefinition,
} from "./MinerTypes";

// ======================================================
// MINING TYCOON 3D
// Server Rack Definitions
// ======================================================

export type RackTier =
  | "starter"
  | "standard"
  | "industrial"
  | "datacenter";

// ======================================================
// RACK DEFINITION
// ======================================================

export type RackDefinition = {
  id: string;

  name: string;

  manufacturer: string;

  tier: RackTier;

  price: number;

  totalSlots: number;

  // Electrical rating of the rack.
  //
  // Kept as rack specification/display data.
  // It does NOT prevent hardware installation.
  //
  // Actual facility electricity availability
  // is handled by PowerSystem.
  maxPower: number;

  width: number;

  height: number;

  depth: number;

  description: string;
};

// ======================================================
// INSTALLED MINER
// ======================================================

export type InstalledMiner = {
  instanceId: string;

  miner: MinerDefinition;

  slotIndex: number;

  powered: boolean;
};

// ======================================================
// RACK INSTANCE
// ======================================================

export type RackInstance = {
  instanceId: string;

  definition: RackDefinition;

  miners: InstalledMiner[];

  position: {
    x: number;
    y: number;
    z: number;
  };

  rotationY: number;
};

// ======================================================
// RACK DATABASE
// ======================================================

export const RACKS: RackDefinition[] = [
  {
    id: "rack_start_8",

    name: "RackBox 8U",

    manufacturer: "RackBox",

    tier: "starter",

    price: 500,

    totalSlots: 8,

    maxPower: 3500,

    width: 1.4,

    height: 2.4,

    depth: 1.0,

    description:
      "Small 8-slot rack designed for beginner mining facilities.",
  },

  {
    id: "rack_pro_16",

    name: "RackBox Pro 16U",

    manufacturer: "RackBox",

    tier: "standard",

    price: 1400,

    totalSlots: 16,

    maxPower: 8500,

    width: 1.5,

    height: 3.0,

    depth: 1.1,

    description:
      "Professional rack with increased capacity and improved power delivery.",
  },

  {
    id: "rack_industrial_24",

    name: "IronGrid 24U",

    manufacturer: "IronGrid",

    tier: "industrial",

    price: 3200,

    totalSlots: 24,

    maxPower: 18000,

    width: 1.6,

    height: 3.5,

    depth: 1.2,

    description:
      "Heavy-duty mining rack designed for industrial mining hardware.",
  },

  {
    id: "rack_datacenter_40",

    name: "TitanRack 40U",

    manufacturer: "Titan Systems",

    tier: "datacenter",

    price: 7500,

    totalSlots: 40,

    maxPower: 40000,

    width: 1.7,

    height: 4.0,

    depth: 1.3,

    description:
      "High-density rack designed for large data-center mining operations.",
  },
];

// ======================================================
// GET RACK BY ID
// ======================================================

export function getRackById(
  id: string
): RackDefinition | undefined {
  return RACKS.find(
    (rack) =>
      rack.id === id
  );
}

// ======================================================
// USED SLOTS
// ======================================================

export function getUsedSlots(
  rack: RackInstance
): number {
  return rack.miners.reduce(
    (
      total,
      installedMiner
    ) =>
      total +
      installedMiner.miner.rackSlots,
    0
  );
}

// ======================================================
// FREE SLOTS
// ======================================================

export function getFreeSlots(
  rack: RackInstance
): number {
  return Math.max(
    0,
    rack.definition.totalSlots -
      getUsedSlots(rack)
  );
}

// ======================================================
// CURRENT ACTIVE POWER
//
// Only powered miners consume electricity.
// ======================================================

export function getRackPowerUsage(
  rack: RackInstance
): number {
  return rack.miners.reduce(
    (
      total,
      installedMiner
    ) => {
      if (
        !installedMiner.powered
      ) {
        return total;
      }

      return (
        total +
        installedMiner.miner.powerUsage
      );
    },
    0
  );
}

// ======================================================
// INSTALLED POWER REQUIREMENT
//
// Total theoretical power requirement of all hardware.
//
// This is informational only.
// It does NOT block installation.
// ======================================================

export function getInstalledPowerRequirement(
  rack: RackInstance
): number {
  return rack.miners.reduce(
    (
      total,
      installedMiner
    ) =>
      total +
      installedMiner.miner.powerUsage,
    0
  );
}

// ======================================================
// ACTIVE HASHRATE
// ======================================================

export function getRackHashrate(
  rack: RackInstance
): number {
  return rack.miners.reduce(
    (
      total,
      installedMiner
    ) => {
      if (
        !installedMiner.powered
      ) {
        return total;
      }

      return (
        total +
        installedMiner.miner.hashRate
      );
    },
    0
  );
}

// ======================================================
// ACTIVE HEAT
// ======================================================

export function getRackHeat(
  rack: RackInstance
): number {
  return rack.miners.reduce(
    (
      total,
      installedMiner
    ) => {
      if (
        !installedMiner.powered
      ) {
        return total;
      }

      return (
        total +
        installedMiner.miner.heatOutput
      );
    },
    0
  );
}

// ======================================================
// CHECK AVAILABLE SLOT RANGE
// ======================================================

export function areSlotsAvailable(
  rack: RackInstance,
  startSlot: number,
  requiredSlots: number
): boolean {
  if (
    startSlot < 0 ||
    requiredSlots <= 0
  ) {
    return false;
  }

  const endSlot =
    startSlot +
    requiredSlots;

  if (
    endSlot >
    rack.definition.totalSlots
  ) {
    return false;
  }

  for (
    const installed
    of rack.miners
  ) {
    const installedStart =
      installed.slotIndex;

    const installedEnd =
      installedStart +
      installed.miner.rackSlots;

    const overlaps =
      startSlot < installedEnd &&
      endSlot > installedStart;

    if (overlaps) {
      return false;
    }
  }

  return true;
}

// ======================================================
// FIND AVAILABLE SLOT
// ======================================================

export function findAvailableSlot(
  rack: RackInstance,
  miner: MinerDefinition
): number | null {
  for (
    let slot = 0;
    slot <
    rack.definition.totalSlots;
    slot++
  ) {
    if (
      areSlotsAvailable(
        rack,
        slot,
        miner.rackSlots
      )
    ) {
      return slot;
    }
  }

  return null;
}

// ======================================================
// CAN INSTALL MINER
//
// IMPORTANT:
//
// Rack installation is determined ONLY by physical
// rack space.
//
// Facility electricity is handled by PowerSystem.
//
// This means an 8U rack can contain the full 8U worth
// of hardware even when the facility does not currently
// have enough electricity to power all of it.
// ======================================================

export function canInstallMiner(
  rack: RackInstance,
  miner: MinerDefinition
): boolean {
  const slot =
    findAvailableSlot(
      rack,
      miner
    );

  return slot !== null;
}

// ======================================================
// RACK TIER NAME
// ======================================================

export function getRackTierName(
  tier: RackTier
): string {
  switch (tier) {
    case "starter":
      return "Starter";

    case "standard":
      return "Standard";

    case "industrial":
      return "Industrial";

    case "datacenter":
      return "Data Center";

    default:
      return "Unknown";
  }
}
