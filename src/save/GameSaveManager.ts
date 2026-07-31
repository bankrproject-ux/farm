import type {
  InventorySaveData,
} from "../game/InventorySystem";

import type {
  SavedRackPlacement,
} from "../game/RackPlacementSystem";

import type {
  SavedPowerSourcePlacement,
} from "../game/PowerSourcePlacementSystem";

// ======================================================
// MINING TYCOON 3D
// GAME SAVE MANAGER
// ======================================================
//
// One wallet = one persistent facility.
//
// Saved:
//
// - Inventory
// - Placed racks
// - Miners installed inside racks
// - Placed power sources
// - TYCON balance
// - Total TYCON mined
//
// Installed miners are stored inside:
// placedRacks[].miners
//
// They are NOT stored separately.
// ======================================================

// ======================================================
// GAME SAVE DATA
// ======================================================

export type GameSaveData = {
  version: number;

  inventory:
    InventorySaveData;

  placedRacks:
    SavedRackPlacement[];

  placedPower:
    SavedPowerSourcePlacement[];

  tyconBalance:
    number;

  totalMined:
    number;

  updatedAt:
    number;
};

// ======================================================
// OFFLINE MINING RESULT
// ======================================================

export type OfflineMiningResult = {
  elapsedSeconds: number;

  rewardedSeconds: number;

  capped: boolean;

  activeHashrate: number;

  powerCapacity: number;

  powerUsed: number;

  tyconEarned: number;
};

// ======================================================
// LOAD RESPONSE
// ======================================================

type LoadResponse = {
  ok: boolean;

  exists?: boolean;

  wallet?: string;

  gameState?:
    GameSaveData | null;

  createdAt?: string;

  updatedAt?: string;

  offlineMining?:
    OfflineMiningResult | null;

  error?: string;
};

// ======================================================
// SAVE RESPONSE
// ======================================================

type SaveResponse = {
  ok: boolean;

  wallet?: string;

  createdAt?: string;

  updatedAt?: string;

  error?: string;
};

// ======================================================
// MANAGER
// ======================================================

export default class GameSaveManager {
  private walletAddress:
    string | null = null;

  private saving =
    false;

  private pendingSave:
    GameSaveData | null = null;

  private lastSavedJson =
    "";

  // Latest offline mining result returned
  // by /api/game/load.
  //
  // This is NOT part of the permanent game save.
  private lastOfflineMining:
    OfflineMiningResult | null =
      null;

  // ====================================================
  // SET WALLET
  // ====================================================

  public setWallet(
    wallet: string | null
  ) {
    if (!wallet) {
      this.walletAddress =
        null;

      this.pendingSave =
        null;

      this.lastSavedJson =
        "";

      this.lastOfflineMining =
        null;

      return;
    }

    if (
      !this.isValidWallet(
        wallet
      )
    ) {
      throw new Error(
        "Invalid wallet address."
      );
    }

    const normalized =
      wallet.toLowerCase();

    if (
      this.walletAddress !==
      normalized
    ) {
      this.lastSavedJson =
        "";

      this.pendingSave =
        null;

      this.lastOfflineMining =
        null;
    }

    this.walletAddress =
      normalized;
  }

  // ====================================================
  // GET WALLET
  // ====================================================

  public getWallet():
    string | null {
    return this.walletAddress;
  }

  // ====================================================
  // GET LAST OFFLINE MINING
  // ====================================================

  public getLastOfflineMining():
    OfflineMiningResult | null {
    return this.lastOfflineMining;
  }

  // ====================================================
  // CLEAR LAST OFFLINE MINING
  // ====================================================

  public clearLastOfflineMining() {
    this.lastOfflineMining =
      null;
  }

  // ====================================================
  // LOAD
  // ====================================================

  public async load():
    Promise<GameSaveData | null> {
    const wallet =
      this.requireWallet();

    // Always clear old metadata before
    // starting a new load.
    this.lastOfflineMining =
      null;

    const response =
      await fetch(
        `/api/game/load?wallet=${encodeURIComponent(
          wallet
        )}`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

    let result:
      LoadResponse;

    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        "Invalid response from save server."
      );
    }

    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.error ??
          "Could not load game."
      );
    }

    // ==================================================
    // OFFLINE MINING METADATA
    // ==================================================

    if (
      this.isValidOfflineMining(
        result.offlineMining
      )
    ) {
      this.lastOfflineMining = {
        elapsedSeconds:
          this.safeNumber(
            result.offlineMining
              .elapsedSeconds
          ),

        rewardedSeconds:
          this.safeNumber(
            result.offlineMining
              .rewardedSeconds
          ),

        capped:
          result.offlineMining
            .capped === true,

        activeHashrate:
          this.safeNumber(
            result.offlineMining
              .activeHashrate
          ),

        powerCapacity:
          this.safeNumber(
            result.offlineMining
              .powerCapacity
          ),

        powerUsed:
          this.safeNumber(
            result.offlineMining
              .powerUsed
          ),

        tyconEarned:
          this.safeNumber(
            result.offlineMining
              .tyconEarned
          ),
      };
    }

    // ==================================================
    // NEW PLAYER
    // ==================================================

    if (
      !result.exists ||
      !result.gameState
    ) {
      this.lastSavedJson =
        "";

      this.lastOfflineMining =
        null;

      return null;
    }

    // ==================================================
    // EXISTING PLAYER
    // ==================================================

    const gameState =
      this.normalizeSave(
        result.gameState
      );

    this.lastSavedJson =
      JSON.stringify(
        gameState
      );

    return gameState;
  }

  // ====================================================
  // SAVE
  // ====================================================

  public async save(
    state: GameSaveData
  ): Promise<void> {
    this.requireWallet();

    const normalized =
      this.normalizeSave(
        state
      );

    const serialized =
      JSON.stringify(
        normalized
      );

    // Nothing changed.
    if (
      serialized ===
      this.lastSavedJson
    ) {
      return;
    }

    // Another save is already running.
    // Keep only the newest state.
    if (
      this.saving
    ) {
      this.pendingSave =
        normalized;

      return;
    }

    await this.performSave(
      normalized
    );
  }

  // ====================================================
  // FORCE SAVE
  // ====================================================

  public async forceSave(
    state: GameSaveData
  ): Promise<void> {
    this.requireWallet();

    this.lastSavedJson =
      "";

    await this.save(
      state
    );
  }

  // ====================================================
  // PERFORM SAVE
  // ====================================================

  private async performSave(
    state: GameSaveData
  ): Promise<void> {
    const wallet =
      this.requireWallet();

    this.saving =
      true;

    try {
      const serialized =
        JSON.stringify(
          state
        );

      const response =
        await fetch(
          "/api/game/save",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                wallet,

                gameState:
                  state,
              }),
          }
        );

      let result:
        SaveResponse;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Invalid response from save server."
        );
      }

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Could not save game."
        );
      }

      this.lastSavedJson =
        serialized;
    } finally {
      this.saving =
        false;
    }

    // ==================================================
    // PROCESS QUEUED SAVE
    // ==================================================

    if (
      this.pendingSave
    ) {
      const pending =
        this.pendingSave;

      this.pendingSave =
        null;

      const pendingJson =
        JSON.stringify(
          pending
        );

      if (
        pendingJson !==
        this.lastSavedJson
      ) {
        await this.performSave(
          pending
        );
      }
    }
  }

  // ====================================================
  // CREATE EMPTY SAVE
  // ====================================================

  public createEmptySave():
    GameSaveData {
    return {
      version: 2,

      inventory: {
        items: [],
      },

      placedRacks: [],

      placedPower: [],

      tyconBalance: 0,

      totalMined: 0,

      updatedAt:
        Date.now(),
    };
  }

  // ====================================================
  // NORMALIZE SAVE
  // ====================================================

  private normalizeSave(
    value: GameSaveData
  ): GameSaveData {
    // ==================================================
    // INVENTORY
    // ==================================================

    const inventory:
      InventorySaveData = {
        items: [],
      };

    if (
      value.inventory &&
      typeof value.inventory ===
        "object" &&
      Array.isArray(
        value.inventory.items
      )
    ) {
      inventory.items =
        value.inventory.items;
    }

    // ==================================================
    // PLACED RACKS
    // ==================================================

    const placedRacks:
      SavedRackPlacement[] =
        [];

    if (
      Array.isArray(
        value.placedRacks
      )
    ) {
      for (
        const rack
        of value.placedRacks
      ) {
        if (
          this.isValidRackPlacement(
            rack
          )
        ) {
          placedRacks.push(
            rack
          );
        }
      }
    }

    // ==================================================
    // PLACED POWER
    // ==================================================

    const placedPower:
      SavedPowerSourcePlacement[] =
        [];

    if (
      Array.isArray(
        value.placedPower
      )
    ) {
      for (
        const power
        of value.placedPower
      ) {
        if (
          this.isValidPowerPlacement(
            power
          )
        ) {
          placedPower.push(
            power
          );
        }
      }
    }

    // ==================================================
    // RETURN
    // ==================================================

    return {
      version:
        typeof value.version ===
          "number" &&
        Number.isFinite(
          value.version
        )
          ? Math.max(
              2,
              Math.floor(
                value.version
              )
            )
          : 2,

      inventory,

      placedRacks,

      placedPower,

      tyconBalance:
        this.safeNumber(
          value.tyconBalance
        ),

      totalMined:
        this.safeNumber(
          value.totalMined
        ),

      updatedAt:
        typeof value.updatedAt ===
          "number" &&
        Number.isFinite(
          value.updatedAt
        )
          ? value.updatedAt
          : Date.now(),
    };
  }

  // ====================================================
  // VALIDATE OFFLINE MINING
  // ====================================================

  private isValidOfflineMining(
    value: unknown
  ): value is OfflineMiningResult {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    const offline =
      value as Partial<
        OfflineMiningResult
      >;

    return (
      typeof offline.elapsedSeconds ===
        "number" &&
      Number.isFinite(
        offline.elapsedSeconds
      ) &&

      typeof offline.rewardedSeconds ===
        "number" &&
      Number.isFinite(
        offline.rewardedSeconds
      ) &&

      typeof offline.capped ===
        "boolean" &&

      typeof offline.activeHashrate ===
        "number" &&
      Number.isFinite(
        offline.activeHashrate
      ) &&

      typeof offline.powerCapacity ===
        "number" &&
      Number.isFinite(
        offline.powerCapacity
      ) &&

      typeof offline.powerUsed ===
        "number" &&
      Number.isFinite(
        offline.powerUsed
      ) &&

      typeof offline.tyconEarned ===
        "number" &&
      Number.isFinite(
        offline.tyconEarned
      )
    );
  }

  // ====================================================
  // VALIDATE RACK PLACEMENT
  // ====================================================

  private isValidRackPlacement(
    value: unknown
  ): value is SavedRackPlacement {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    const rack =
      value as Partial<
        SavedRackPlacement
      >;

    if (
      typeof rack.instanceId !==
        "string" ||
      rack.instanceId.length ===
        0
    ) {
      return false;
    }

    if (
      !rack.definition ||
      typeof rack.definition !==
        "object"
    ) {
      return false;
    }

    if (
      !Array.isArray(
        rack.miners
      )
    ) {
      return false;
    }

    for (
      const installedMiner
      of rack.miners
    ) {
      if (
        !this.isValidInstalledMiner(
          installedMiner
        )
      ) {
        return false;
      }
    }

    if (
      !this.isValidPosition(
        rack.position
      )
    ) {
      return false;
    }

    if (
      typeof rack.rotationY !==
        "number" ||
      !Number.isFinite(
        rack.rotationY
      )
    ) {
      return false;
    }

    return true;
  }

  // ====================================================
  // VALIDATE INSTALLED MINER
  // ====================================================

  private isValidInstalledMiner(
    value: unknown
  ): boolean {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    const miner =
      value as {
        instanceId?: unknown;
        miner?: unknown;
        slotIndex?: unknown;
        powered?: unknown;
      };

    if (
      typeof miner.instanceId !==
        "string" ||
      miner.instanceId.length ===
        0
    ) {
      return false;
    }

    if (
      !miner.miner ||
      typeof miner.miner !==
        "object"
    ) {
      return false;
    }

    if (
      typeof miner.slotIndex !==
        "number" ||
      !Number.isFinite(
        miner.slotIndex
      ) ||
      miner.slotIndex < 0
    ) {
      return false;
    }

    if (
      typeof miner.powered !==
        "boolean"
    ) {
      return false;
    }

    return true;
  }

  // ====================================================
  // VALIDATE POWER PLACEMENT
  // ====================================================

  private isValidPowerPlacement(
    value: unknown
  ): value is SavedPowerSourcePlacement {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    const power =
      value as Partial<
        SavedPowerSourcePlacement
      >;

    if (
      typeof power.instanceId !==
        "string" ||
      power.instanceId.length ===
        0
    ) {
      return false;
    }

    if (
      !power.definition ||
      typeof power.definition !==
        "object"
    ) {
      return false;
    }

    if (
      !this.isValidPosition(
        power.position
      )
    ) {
      return false;
    }

    if (
      typeof power.rotationY !==
        "number" ||
      !Number.isFinite(
        power.rotationY
      )
    ) {
      return false;
    }

    if (
      typeof power.enabled !==
        "boolean"
    ) {
      return false;
    }

    return true;
  }

  // ====================================================
  // VALIDATE POSITION
  // ====================================================

  private isValidPosition(
    value: unknown
  ): value is {
    x: number;
    y: number;
    z: number;
  } {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    const position =
      value as {
        x?: unknown;
        y?: unknown;
        z?: unknown;
      };

    return (
      typeof position.x ===
        "number" &&
      Number.isFinite(
        position.x
      ) &&

      typeof position.y ===
        "number" &&
      Number.isFinite(
        position.y
      ) &&

      typeof position.z ===
        "number" &&
      Number.isFinite(
        position.z
      )
    );
  }

  // ====================================================
  // SAFE NUMBER
  // ====================================================

  private safeNumber(
    value: unknown
  ): number {
    if (
      typeof value !==
        "number" ||
      !Number.isFinite(
        value
      ) ||
      value < 0
    ) {
      return 0;
    }

    return value;
  }

  // ====================================================
  // REQUIRE WALLET
  // ====================================================

  private requireWallet():
    string {
    if (
      !this.walletAddress
    ) {
      throw new Error(
        "No wallet selected for game save."
      );
    }

    return this.walletAddress;
  }

  // ====================================================
  // VALIDATE WALLET
  // ====================================================

  private isValidWallet(
    wallet: string
  ): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(
      wallet
    );
  }

  // ====================================================
  // RESET
  // ====================================================

  public reset() {
    this.walletAddress =
      null;

    this.pendingSave =
      null;

    this.lastSavedJson =
      "";

    this.lastOfflineMining =
      null;

    this.saving =
      false;
  }
}
