// ======================================================
// MINING TYCOON 3D
// ELECTRICAL / POWER HARDWARE DATABASE
// ======================================================

export type PowerTier =
  | "starter"
  | "basic"
  | "industrial"
  | "datacenter";

// ======================================================
// POWER SOURCE DEFINITION
//
// Static definition of electrical hardware.
//
// capacity = maximum watts this unit can provide.
// ======================================================

export type PowerSourceDefinition = {
  id: string;

  name: string;

  manufacturer: string;

  tier: PowerTier;

  // Purchase price.
  price: number;

  // Maximum electrical output in watts.
  capacity: number;

  // Physical dimensions for later 3D placement.
  width: number;

  height: number;

  depth: number;

  description: string;
};

// ======================================================
// POWER SOURCE INSTANCE
//
// Represents an electrical unit actually owned
// and placed inside the player's facility.
// ======================================================

export type PowerSourceInstance = {
  instanceId: string;

  definition: PowerSourceDefinition;

  position: {
    x: number;
    y: number;
    z: number;
  };

  rotationY: number;

  // Master power switch.
  enabled: boolean;
};

// ======================================================
// POWER HARDWARE DATABASE
// ======================================================

export const POWER_SOURCES:
  PowerSourceDefinition[] = [

  // ----------------------------------------------------
  // STARTER
  // ----------------------------------------------------

  {
    id: "gridbox_2k",

    name: "GridBox 2K",

    manufacturer:
      "VoltCore",

    tier: "starter",

    price: 450,

    capacity: 2000,

    width: 0.8,

    height: 1.2,

    depth: 0.35,

    description:
      "Basic 2 kW electrical distribution unit for small mining setups.",
  },

  // ----------------------------------------------------
  // BASIC
  // ----------------------------------------------------

  {
    id: "gridbox_5k",

    name: "GridBox 5K",

    manufacturer:
      "VoltCore",

    tier: "basic",

    price: 1100,

    capacity: 5000,

    width: 0.9,

    height: 1.4,

    depth: 0.4,

    description:
      "5 kW electrical panel designed for growing mining facilities.",
  },

  // ----------------------------------------------------
  // INDUSTRIAL
  // ----------------------------------------------------

  {
    id: "powerhub_15k",

    name: "PowerHub 15K",

    manufacturer:
      "NexaVolt",

    tier: "industrial",

    price: 3200,

    capacity: 15000,

    width: 1.1,

    height: 1.7,

    depth: 0.5,

    description:
      "Industrial 15 kW power distribution system for multiple mining racks.",
  },

  // ----------------------------------------------------
  // DATA CENTER
  // ----------------------------------------------------

  {
    id: "titan_grid_50k",

    name: "TitanGrid 50K",

    manufacturer:
      "Titan Systems",

    tier: "datacenter",

    price: 8500,

    capacity: 50000,

    width: 1.4,

    height: 2.0,

    depth: 0.6,

    description:
      "50 kW data-center electrical distribution system for large mining farms.",
  },
];

// ======================================================
// GET POWER SOURCE
// ======================================================

export function getPowerSourceById(
  id: string
): PowerSourceDefinition | undefined {
  return POWER_SOURCES.find(
    (source) =>
      source.id === id
  );
}

// ======================================================
// TIER DISPLAY NAME
// ======================================================

export function getPowerTierName(
  tier: PowerTier
): string {
  switch (tier) {
    case "starter":
      return "Starter";

    case "basic":
      return "Basic";

    case "industrial":
      return "Industrial";

    case "datacenter":
      return "Data Center";

    default:
      return "Unknown";
  }
}

// ======================================================
// FORMAT CAPACITY
// ======================================================

export function formatPowerCapacity(
  watts: number
): string {
  if (
    watts >= 1000
  ) {
    return `${(
      watts / 1000
    ).toFixed(1)} kW`;
  }

  return `${watts.toFixed(
    0
  )} W`;
}
