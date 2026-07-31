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
// ======================================================

export type PowerSystemListener = (
  system: PowerSystem
) => void;

export type MinerPowerState = {
  minerInstanceId: string;

  rackInstanceId: string;

  powered: boolean;

  requiredPower: number;
};

export default class PowerSystem {
  private powerSources:
    Map<
      string,
      PowerSourceInstance
    > = new Map();

  private racks:
    Map<
      string,
      RackInstance
    > = new Map();

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
  // CLEAR FACILITY
  //
  // Clears runtime references when switching wallets.
  //
  // Listeners are intentionally preserved because the
  // same PowerSystem instance continues to be used.
  // ====================================================

  public clear() {
    // Turn miners belonging to the old facility off
    // before dropping our references.

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

    this.racks.clear();

    this.powerSources.clear();

    this.notifyListeners();
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
  // ====================================================

  public recalculate() {
    let availablePower =
      this.getTotalCapacity();

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

        if (
          availablePower <
          requiredPower
        ) {
          installed.powered =
            false;

          continue;
        }

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
  // UTILIZATION
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
  // RACK POWER USAGE
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
  // RACK HASHRATE
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
  // MINER POWER STATE
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
  // ACTIVE MINERS
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
