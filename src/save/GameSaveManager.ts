import type {
  InventorySaveData,
} from "../game/InventorySystem";

// ======================================================
// MINING TYCOON 3D
// GAME SAVE MANAGER
// ======================================================
//
// Handles:
//
// GET  /api/game/load
// POST /api/game/save
//
// One wallet = one game save.
//
// ======================================================

// ======================================================
// GAME SAVE DATA
// ======================================================

export type GameSaveData = {
  version: number;

  inventory:
    InventorySaveData;

  placedMiners:
    unknown[];

  placedRacks:
    unknown[];

  placedPower:
    unknown[];

  tyconBalance:
    number;

  totalMined:
    number;

  updatedAt:
    number;
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
  // LOAD
  // ====================================================

  public async load():
    Promise<GameSaveData | null> {
    const wallet =
      this.requireWallet();

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
    // NEW PLAYER
    // ==================================================

    if (
      !result.exists ||
      !result.gameState
    ) {
      this.lastSavedJson =
        "";

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

    // No changes.
    if (
      serialized ===
      this.lastSavedJson
    ) {
      return;
    }

    // Save already running.
    // Keep newest state only.
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
      version: 1,

      inventory: {
        items: [],
      },

      placedMiners: [],

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
              1,
              Math.floor(
                value.version
              )
            )
          : 1,

      inventory,

      placedMiners:
        Array.isArray(
          value.placedMiners
        )
          ? value.placedMiners
          : [],

      placedRacks:
        Array.isArray(
          value.placedRacks
        )
          ? value.placedRacks
          : [],

      placedPower:
        Array.isArray(
          value.placedPower
        )
          ? value.placedPower
          : [],

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

    this.saving =
      false;
  }
}
