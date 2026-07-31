import type {
  MinerDefinition,
} from "../mining/MinerTypes";

import type {
  RackDefinition,
} from "../mining/RackTypes";

import type {
  PowerSourceDefinition,
} from "../mining/PowerTypes";

// ======================================================
// MINING TYCOON 3D
// PLAYER INVENTORY SYSTEM
//
// Supports:
// - Mining servers
// - Server racks
// - Electrical power hardware
// - Export / restore for permanent saves
// ======================================================

// ======================================================
// MINER ITEM
// ======================================================

export type InventoryMinerItem = {
  instanceId: string;

  type: "miner";

  definition: MinerDefinition;

  purchasedAt: number;
};

// ======================================================
// RACK ITEM
// ======================================================

export type InventoryRackItem = {
  instanceId: string;

  type: "rack";

  definition: RackDefinition;

  purchasedAt: number;
};

// ======================================================
// POWER SOURCE ITEM
// ======================================================

export type InventoryPowerSourceItem = {
  instanceId: string;

  type: "power_source";

  definition: PowerSourceDefinition;

  purchasedAt: number;
};

// ======================================================
// INVENTORY ITEM
// ======================================================

export type InventoryItem =
  | InventoryMinerItem
  | InventoryRackItem
  | InventoryPowerSourceItem;

// ======================================================
// SAVED INVENTORY
// ======================================================

export type InventorySaveData = {
  items: InventoryItem[];
};

// ======================================================
// LISTENER
// ======================================================

export type InventoryListener = (
  inventory: InventorySystem
) => void;

// ======================================================
// INVENTORY ITEM TYPE
// ======================================================

type InventoryItemType =
  | "miner"
  | "rack"
  | "power_source";

// ======================================================
// INVENTORY SYSTEM
// ======================================================

export default class InventorySystem {
  private items:
    InventoryItem[] = [];

  private listeners:
    InventoryListener[] = [];

  private instanceCounter =
    0;

  // ====================================================
  // UNIQUE INSTANCE ID
  // ====================================================

  private createInstanceId(
    type: InventoryItemType,
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

        type:
          "miner",

        definition,

        purchasedAt:
          Date.now(),
      };

    this.items.push(
      item
    );

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

        type:
          "rack",

        definition,

        purchasedAt:
          Date.now(),
      };

    this.items.push(
      item
    );

    this.notifyListeners();

    return item;
  }

  // ====================================================
  // ADD POWER SOURCE
  // ====================================================

  public addPowerSource(
    definition:
      PowerSourceDefinition
  ): InventoryPowerSourceItem {
    const item:
      InventoryPowerSourceItem = {
        instanceId:
          this.createInstanceId(
            "power_source",
            definition.id
          ),

        type:
          "power_source",

        definition,

        purchasedAt:
          Date.now(),
      };

    this.items.push(
      item
    );

    this.notifyListeners();

    return item;
  }

  // ====================================================
  // REMOVE ITEM
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

    if (
      index === -1
    ) {
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
      ): item is
        InventoryMinerItem =>
        item.type ===
        "miner"
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
      ): item is
        InventoryRackItem =>
        item.type ===
        "rack"
    );
  }

  // ====================================================
  // GET POWER SOURCES
  // ====================================================

  public getPowerSources():
    InventoryPowerSourceItem[] {
    return this.items.filter(
      (
        item
      ): item is
        InventoryPowerSourceItem =>
        item.type ===
        "power_source"
    );
  }

  // ====================================================
  // COUNT MINER MODEL
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
  // COUNT POWER SOURCE MODEL
  // ====================================================

  public countPowerSource(
    definitionId: string
  ): number {
    return this
      .getPowerSources()
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
  // EXPORT SAVE
  // ====================================================

  public exportSave():
    InventorySaveData {
    return {
      items:
        this.items.map(
          (item): InventoryItem => {
            if (
              item.type ===
              "miner"
            ) {
              return {
                instanceId:
                  item.instanceId,

                type:
                  "miner",

                definition: {
                  ...item.definition,
                },

                purchasedAt:
                  item.purchasedAt,
              };
            }

            if (
              item.type ===
              "rack"
            ) {
              return {
                instanceId:
                  item.instanceId,

                type:
                  "rack",

                definition: {
                  ...item.definition,
                },

                purchasedAt:
                  item.purchasedAt,
              };
            }

            return {
              instanceId:
                item.instanceId,

              type:
                "power_source",

              definition: {
                ...item.definition,
              },

              purchasedAt:
                item.purchasedAt,
            };
          }
        ),
    };
  }
  
  // ====================================================
  // RESTORE SAVE
  // ====================================================

  public restoreSave(
    save:
      InventorySaveData | null | undefined
  ) {
    if (
      !save ||
      !Array.isArray(
        save.items
      )
    ) {
      this.items =
        [];

      this.notifyListeners();

      return;
    }

    const restored:
      InventoryItem[] = [];

    for (
      const rawItem
      of save.items
    ) {
      if (
        !rawItem ||
        typeof rawItem !==
          "object"
      ) {
        continue;
      }

      if (
        typeof rawItem.instanceId !==
          "string" ||
        !rawItem.instanceId
      ) {
        continue;
      }

      if (
        rawItem.type !==
          "miner" &&
        rawItem.type !==
          "rack" &&
        rawItem.type !==
          "power_source"
      ) {
        continue;
      }

      if (
        !rawItem.definition ||
        typeof rawItem.definition !==
          "object"
      ) {
        continue;
      }

      if (
        typeof rawItem.definition.id !==
          "string"
      ) {
        continue;
      }

      if (
        typeof rawItem.purchasedAt !==
          "number" ||
        !Number.isFinite(
          rawItem.purchasedAt
        )
      ) {
        continue;
      }

      restored.push(
        rawItem
      );
    }

    this.items =
      restored;

    // Avoid unnecessary instance ID collisions
    // during this browser session.
    this.instanceCounter =
      restored.length;

    this.notifyListeners();
  }

  // ====================================================
  // CLEAR INVENTORY
  // ====================================================

  public clear() {
    this.items =
      [];

    this.instanceCounter =
      0;

    this.notifyListeners();
  }

  // ====================================================
  // EVENTS
  // ====================================================

  public subscribe(
    listener:
      InventoryListener
  ) {
    this.listeners.push(
      listener
    );

    listener(this);

    return () => {
      this.listeners =
        this.listeners.filter(
          (
            currentListener
          ) =>
            currentListener !==
            listener
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
