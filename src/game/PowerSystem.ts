import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

import type {
  PowerSourceInstance,
} from "../mining/PowerTypes";

// ======================================================
// MINING TYCOON 3D
// FACILITY POWER SYSTEM
//
// Handles:
// - Facility electrical capacity
// - Power source registration
// - Miner power allocation
// - Automatic overload handling
//
// IMPORTANT:
//
// Electricity is controlled by FACILITY CAPACITY.
//
// Rack maxPower is no longer used as a hard limit.
// Rack capacity is determined by physical U space,
// while PowerSystem determines whether installed
// miners actually receive electricity.
// ======================================================

// ======================================================
// POWER SYSTEM LISTENER
// ======================================================

export type PowerSystemListener = (
  system: PowerSystem
) => void;

// ======================================================
// MINER POWER RESULT
// ======================================================

export type MinerPowerState = {
  minerInstanceId: string;

  rackInstanceId: string;

  powered: boolean;

  requiredPower: number;
};

// ======================================================
// POWER SYSTEM
// ======================================================

export default class PowerSystem {
  // ====================================================
  // PLACED POWER SOURCES
  // ====================================================

  private powerSources:
    Map<
      string,
      PowerSourceInstance
    > = new Map();

  // ====================================================
  // PLACED RACKS
  // ====================================================

  private racks:
    Map<
      string,
      RackInstance
    > = new Map();

  // ====================================================
  // LISTENERS
  // ====================================================

  private listeners:
    PowerSystemListener[] = [];

  // ====================================================
  // REGISTER POWER SOURCE
  // ====================================================

  public registerPowerSource(
    source: PowerSourceInstance
  ) {
    this.powerSources.set(
      source.instanceId,
      source
    );

    this.recalculate();
  }

  // ====================================================
  // REMOVE POWER SOURCE
  // ====================================================

  public removePowerSource(
    instanceId: string
  ): boolean {
    const removed =
      this.powerSources.delete(
        instanceId
      );

    if (!removed) {
      return false;
    }

    this.recalculate();

    return true;
  }

  // ====================================================
  // REGISTER RACK
  // ====================================================

  public registerRack(
    rack: RackInstance
  ) {
    this.racks.set(
      rack.instanceId,
      rack
    );

    this.recalculate();
  }

  // ====================================================
  // REMOVE RACK
  // ====================================================

  public removeRack(
    rackInstanceId: string
  ): boolean {
    const rack =
      this.racks.get(
        rackInstanceId
      );

    if (!rack) {
      return false;
    }

    // Turn all miners off before removing
    // rack from the facility network.

    for (
      const installed
      of rack.miners
    ) {
      installed.powered =
        false;
    }

    this.racks.delete(
      rackInstanceId
    );

    this.recalculate();

    return true;
  }

  // ====================================================
  // POWER SOURCE ENABLE / DISABLE
  // ====================================================

  public setPowerSourceEnabled(
    instanceId: string,
    enabled: boolean
  ): boolean {
    const source =
      this.powerSources.get(
        instanceId
      );

    if (!source) {
      return false;
    }

    source.enabled =
      enabled;

    this.recalculate();

    return true;
  }

  // ====================================================
  // RECALCULATE
  //
  // Electricity is allocated from total facility
  // capacity.
  //
  // Allocation order:
  //
  // 1. Rack registration order
  // 2. Miner rack slot order
  //
  // If facility capacity runs out, remaining miners
  // stay OFFLINE.
  //
  // Rack maxPower is intentionally NOT checked here.
  // ====================================================

  public recalculate() {
    let availablePower =
      this.getTotalCapacity();

    // ----------------------------------------------
    // FIRST TURN EVERYTHING OFF
    // ----------------------------------------------

    for (
      const rack
      of this.racks.values()
    ) {
      for (
        const installed
        of rack.miners
      ) {
        installed.powered =
          false;
      }
    }

    // ----------------------------------------------
    // ALLOCATE FACILITY POWER
    // ----------------------------------------------

    for (
      const rack
      of this.racks.values()
    ) {
      const sortedMiners =
        [...rack.miners].sort(
          (a, b) =>
            a.slotIndex -
            b.slotIndex
        );

      for (
        const installed
        of sortedMiners
      ) {
        const requiredPower =
          installed.miner
            .powerUsage;

        // ------------------------------------------
        // FACILITY CAPACITY CHECK
        // ------------------------------------------

        if (
          availablePower <
          requiredPower
        ) {
          installed.powered =
            false;

          continue;
        }

        // ------------------------------------------
        // POWER MINER
        // ------------------------------------------

        installed.powered =
          true;

        availablePower -=
          requiredPower;
      }
    }

    this.notifyListeners();
  }

  // ====================================================
  // TOTAL CAPACITY
  //
  // Only ENABLED power sources count.
  // ====================================================

  public getTotalCapacity():
    number {
    let total =
      0;

    for (
      const source
      of this.powerSources.values()
    ) {
      if (
        !source.enabled
      ) {
        continue;
      }

      total +=
        source.definition.capacity;
    }

    return total;
  }

  // ====================================================
  // INSTALLED CAPACITY
  //
  // Includes disabled power sources.
  // ====================================================

  public getInstalledCapacity():
    number {
    let total =
      0;

    for (
      const source
      of this.powerSources.values()
    ) {
      total +=
        source.definition.capacity;
    }

    return total;
  }

  // ====================================================
  // TOTAL DEMAND
  //
  // Electricity required if every installed miner
  // were powered.
  // ====================================================

  public getTotalDemand():
    number {
    let total =
      0;

    for (
      const rack
      of this.racks.values()
    ) {
      for (
        const installed
        of rack.miners
      ) {
        total +=
          installed.miner
            .powerUsage;
      }
    }

    return total;
  }

  // ====================================================
  // CURRENT POWER USAGE
  //
  // Only powered miners count.
  // ====================================================

  public getCurrentPowerUsage():
    number {
    let total =
      0;

    for (
      const rack
      of this.racks.values()
    ) {
      for (
        const installed
        of rack.miners
      ) {
        if (
          !installed.powered
        ) {
          continue;
        }

        total +=
          installed.miner
            .powerUsage;
      }
    }

    return total;
  }

  // ====================================================
  // TOTAL ACTIVE HASHRATE
  // ====================================================

  public getActiveHashrate():
    number {
    let total =
      0;

    for (
      const rack
      of this.racks.values()
    ) {
      for (
        const installed
        of rack.miners
      ) {
        if (
          !installed.powered
        ) {
          continue;
        }

        total +=
          installed.miner
            .hashRate;
      }
    }

    return total;
  }

  // ====================================================
  // AVAILABLE POWER
  // ====================================================

  public getAvailablePower():
    number {
    return Math.max(
      0,
      this.getTotalCapacity() -
        this.getCurrentPowerUsage()
    );
  }

  // ====================================================
  // POWER UTILIZATION
  //
  // Returns 0 -> 1.
  // ====================================================

  public getUtilization():
    number {
    const capacity =
      this.getTotalCapacity();

    if (
      capacity <= 0
    ) {
      return 0;
    }

    return Math.min(
      1,
      this.getCurrentPowerUsage() /
        capacity
    );
  }

  // ====================================================
  // OVERLOADED
  //
  // True when installed hardware requires more
  // electricity than the facility can supply.
  // ====================================================

  public isOverloaded():
    boolean {
    return (
      this.getTotalDemand() >
      this.getTotalCapacity()
    );
  }

  // ====================================================
  // HAS POWER
  // ====================================================

  public hasPower():
    boolean {
    return (
      this.getTotalCapacity() >
      0
    );
  }

  // ====================================================
  // RACK CURRENT POWER
  // ====================================================

  public getRackPowerUsage(
    rackInstanceId: string
  ): number {
    const rack =
      this.racks.get(
        rackInstanceId
      );

    if (!rack) {
      return 0;
    }

    let total =
      0;

    for (
      const installed
      of rack.miners
    ) {
      if (
        installed.powered
      ) {
        total +=
          installed.miner
            .powerUsage;
      }
    }

    return total;
  }

  // ====================================================
  // RACK ACTIVE HASHRATE
  // ====================================================

  public getRackHashrate(
    rackInstanceId: string
  ): number {
    const rack =
      this.racks.get(
        rackInstanceId
      );

    if (!rack) {
      return 0;
    }

    let total =
      0;

    for (
      const installed
      of rack.miners
    ) {
      if (
        installed.powered
      ) {
        total +=
          installed.miner
            .hashRate;
      }
    }

    return total;
  }

  // ====================================================
  // IS RACK POWERED
  // ====================================================

  public isRackPowered(
    rackInstanceId: string
  ): boolean {
    const rack =
      this.racks.get(
        rackInstanceId
      );

    if (!rack) {
      return false;
    }

    return rack.miners.some(
      (installed) =>
        installed.powered
    );
  }

  // ====================================================
  // GET MINER POWER STATE
  // ====================================================

  public getMinerPowerState(
    minerInstanceId: string
  ): MinerPowerState | null {
    for (
      const rack
      of this.racks.values()
    ) {
      const installed =
        rack.miners.find(
          (miner) =>
            miner.instanceId ===
            minerInstanceId
        );

      if (!installed) {
        continue;
      }

      return {
        minerInstanceId:
          installed.instanceId,

        rackInstanceId:
          rack.instanceId,

        powered:
          installed.powered,

        requiredPower:
          installed.miner
            .powerUsage,
      };
    }

    return null;
  }

  // ====================================================
  // GET POWER SOURCES
  // ====================================================

  public getPowerSources():
    PowerSourceInstance[] {
    return [
      ...this.powerSources.values(),
    ];
  }

  // ====================================================
  // GET RACKS
  // ====================================================

  public getRacks():
    RackInstance[] {
    return [
      ...this.racks.values(),
    ];
  }

  // ====================================================
  // GET ACTIVE MINERS
  // ====================================================

  public getActiveMiners():
    InstalledMiner[] {
    const result:
      InstalledMiner[] = [];

    for (
      const rack
      of this.racks.values()
    ) {
      for (
        const installed
        of rack.miners
      ) {
        if (
          installed.powered
        ) {
          result.push(
            installed
          );
        }
      }
    }

    return result;
  }

  // ====================================================
  // EVENTS
  // ====================================================

  public subscribe(
    listener:
      PowerSystemListener
  ) {
    this.listeners.push(
      listener
    );

    listener(this);

    return () => {
      this.listeners =
        this.listeners.filter(
          (item) =>
            item !== listener
        );
    };
  }

  // ====================================================
  // NOTIFY
  // ====================================================

  private notifyListeners() {
    for (
      const listener
      of this.listeners
    ) {
      listener(this);
    }
  }
}
