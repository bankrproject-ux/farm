import type {
  MinerDefinition,
} from "../mining/MinerTypes";

import type {
  RackDefinition,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// Player Inventory System
// ======================================================

export type InventoryMinerItem = {
  instanceId: string;

  type: "miner";

  definition: MinerDefinition;

  purchasedAt: number;
};

export type InventoryRackItem = {
  instanceId: string;

  type: "rack";

  definition: RackDefinition;

  purchasedAt: number;
};

export type InventoryItem =
  | InventoryMinerItem
  | InventoryRackItem;

export type InventoryListener = (
  inventory: InventorySystem
) => void;

// ======================================================
// INVENTORY SYSTEM
// ======================================================

export default class InventorySystem {
  private items:
    InventoryItem[] = [];

  private listeners:
    InventoryListener[] = [];

  private instanceCounter = 0;

  // ====================================================
  // UNIQUE INSTANCE ID
  //
  // Every purchased item gets its own ID.
  //
  // Example:
  // miner_bitforge_s1_1
  // miner_bitforge_s1_2
  // rack_rack_start_8_3
  // ====================================================

  private createInstanceId(
    type: "miner" | "rack",
    definitionId: string
  ): string {
    this.instanceCounter++;

    return [
      type,
      definitionId,
      Date.now(),
      this.instanceCounter,
    ].join("_");
  }

  // ====================================================
  // ADD MINER
  // ====================================================

  public addMiner(
    definition: MinerDefinition
  ): InventoryMinerItem {
    const item:
      InventoryMinerItem = {
        instanceId:
          this.createInstanceId(
            "miner",
            definition.id
          ),

        type: "miner",

        definition,

        purchasedAt:
          Date.now(),
      };

    this.items.push(item);

    this.notifyListeners();

    return item;
  }

  // ====================================================
  // ADD RACK
  // ====================================================

  public addRack(
    definition: RackDefinition
  ): InventoryRackItem {
    const item:
      InventoryRackItem = {
        instanceId:
          this.createInstanceId(
            "rack",
            definition.id
          ),

        type: "rack",

        definition,

        purchasedAt:
          Date.now(),
      };

    this.items.push(item);

    this.notifyListeners();

    return item;
  }

  // ====================================================
  // REMOVE ITEM
  //
  // Used when:
  //
  // Rack is placed into the world.
  // Miner is installed into a rack.
  // Item is sold.
  // ====================================================

  public removeItem(
    instanceId: string
  ): InventoryItem | null {
    const index =
      this.items.findIndex(
        (item) =>
          item.instanceId ===
          instanceId
      );

    if (index === -1) {
      return null;
    }

    const [
      removedItem,
    ] =
      this.items.splice(
        index,
        1
      );

    this.notifyListeners();

    return removedItem;
  }

  // ====================================================
  // GET ITEM
  // ====================================================

  public getItem(
    instanceId: string
  ): InventoryItem | undefined {
    return this.items.find(
      (item) =>
        item.instanceId ===
        instanceId
    );
  }

  // ====================================================
  // GET ALL ITEMS
  // ====================================================

  public getItems():
    readonly InventoryItem[] {
    return this.items;
  }

  // ====================================================
  // GET MINERS
  // ====================================================

  public getMiners():
    InventoryMinerItem[] {
    return this.items.filter(
      (
        item
      ): item is InventoryMinerItem =>
        item.type === "miner"
    );
  }

  // ====================================================
  // GET RACKS
  // ====================================================

  public getRacks():
    InventoryRackItem[] {
    return this.items.filter(
      (
        item
      ): item is InventoryRackItem =>
        item.type === "rack"
    );
  }

  // ====================================================
  // COUNT MINER MODEL
  //
  // Example:
  // How many BitForge S1 are currently
  // sitting in inventory?
  // ====================================================

  public countMiner(
    definitionId: string
  ): number {
    return this.getMiners()
      .filter(
        (item) =>
          item.definition.id ===
          definitionId
      )
      .length;
  }

  // ====================================================
  // COUNT RACK MODEL
  // ====================================================

  public countRack(
    definitionId: string
  ): number {
    return this.getRacks()
      .filter(
        (item) =>
          item.definition.id ===
          definitionId
      )
      .length;
  }

  // ====================================================
  // INVENTORY SIZE
  // ====================================================

  public getItemCount():
    number {
    return this.items.length;
  }

  // ====================================================
  // TOTAL INVENTORY VALUE
  //
  // Useful later for player statistics
  // and selling hardware.
  // ====================================================

  public getTotalValue():
    number {
    return this.items.reduce(
      (
        total,
        item
      ) => {
        return (
          total +
          item.definition.price
        );
      },
      0
    );
  }

  // ====================================================
  // CLEAR INVENTORY
  //
  // Mostly useful for save loading / testing.
  // ====================================================

  public clear() {
    this.items = [];

    this.notifyListeners();
  }

  // ====================================================
  // EVENTS
  // ====================================================

  public subscribe(
    listener: InventoryListener
  ) {
    this.listeners.push(
      listener
    );

    listener(this);

    return () => {
      this.listeners =
        this.listeners.filter(
          (currentListener) =>
            currentListener !==
            listener
        );
    };
  }

  private notifyListeners() {
    for (
      const listener
      of this.listeners
    ) {
      listener(this);
    }
  }
}
