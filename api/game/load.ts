import {
  neon,
} from "@neondatabase/serverless";

// ======================================================
// MINING TYCOON 3D
// LOAD GAME SAVE + OFFLINE MINING
// ======================================================

// ======================================================
// OFFLINE MINING SETTINGS
// ======================================================
//
// Must match GameState:
//
// 1 MH/s = 0.00015 TYCON / second.
//
// Offline mining is capped at 12 hours.
// ======================================================

const TYCON_PER_MH_PER_SECOND =
  0.00015;

const MAX_OFFLINE_SECONDS =
  12 * 60 * 60;

// Ignore tiny disconnect/reconnect windows.
//
// This also avoids showing silly offline rewards
// when the player reconnects immediately.
const MIN_OFFLINE_SECONDS =
  5;

// ======================================================
// API TYPES
// ======================================================

type ApiRequest = {
  method?: string;

  query?: {
    wallet?: string | string[];
  };
};

type ApiResponse = {
  status: (
    code: number
  ) => ApiResponse;

  json: (
    data: unknown
  ) => void;

  setHeader: (
    name: string,
    value: string
  ) => void;
};

// ======================================================
// GENERIC OBJECT
// ======================================================

type JsonObject = Record<
  string,
  unknown
>;

// ======================================================
// OFFLINE RESULT
// ======================================================

type OfflineMiningResult = {
  elapsedSeconds: number;

  rewardedSeconds: number;

  capped: boolean;

  activeHashrate: number;

  powerCapacity: number;

  powerUsed: number;

  tyconEarned: number;
};

// ======================================================
// WALLET VALIDATION
// ======================================================

function isValidWallet(
  wallet: string
): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(
    wallet
  );
}

// ======================================================
// OBJECT CHECK
// ======================================================

function isObject(
  value: unknown
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

// ======================================================
// SAFE NUMBER
// ======================================================

function safeNumber(
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

// ======================================================
// GET POWER CAPACITY
// ======================================================

function getPowerCapacity(
  gameState: JsonObject
): number {
  const placedPower =
    gameState.placedPower;

  if (
    !Array.isArray(
      placedPower
    )
  ) {
    return 0;
  }

  let totalCapacity =
    0;

  for (
    const source
    of placedPower
  ) {
    if (
      !isObject(
        source
      )
    ) {
      continue;
    }

    // Disabled power sources provide no electricity.

    if (
      source.enabled !==
      true
    ) {
      continue;
    }

    const definition =
      source.definition;

    if (
      !isObject(
        definition
      )
    ) {
      continue;
    }

    totalCapacity +=
      safeNumber(
        definition.capacity
      );
  }

  return totalCapacity;
}

// ======================================================
// CALCULATE ACTIVE MINING
// ======================================================
//
// This intentionally mirrors PowerSystem:
//
// 1. Determine total enabled facility power.
// 2. Walk racks in stored order.
// 3. Sort miners by slotIndex inside each rack.
// 4. Power miners while capacity remains.
// 5. Miner contributes hashrate only if powered.
//
// We DO NOT trust saved `powered` flags here.
// Server calculates power availability itself.
// ======================================================

function calculateActiveMining(
  gameState: JsonObject
): {
  activeHashrate: number;
  powerCapacity: number;
  powerUsed: number;
} {
  const powerCapacity =
    getPowerCapacity(
      gameState
    );

  let availablePower =
    powerCapacity;

  let activeHashrate =
    0;

  let powerUsed =
    0;

  const placedRacks =
    gameState.placedRacks;

  if (
    !Array.isArray(
      placedRacks
    )
  ) {
    return {
      activeHashrate,
      powerCapacity,
      powerUsed,
    };
  }

  for (
    const rack
    of placedRacks
  ) {
    if (
      !isObject(
        rack
      )
    ) {
      continue;
    }

    const miners =
      rack.miners;

    if (
      !Array.isArray(
        miners
      )
    ) {
      continue;
    }

    // Same behavior as PowerSystem:
    // lower rack slots receive power first.

    const sortedMiners =
      [...miners].sort(
        (
          first,
          second
        ) => {
          const firstSlot =
            isObject(first)
              ? safeNumber(
                  first.slotIndex
                )
              : 0;

          const secondSlot =
            isObject(second)
              ? safeNumber(
                  second.slotIndex
                )
              : 0;

          return (
            firstSlot -
            secondSlot
          );
        }
      );

    for (
      const installedMiner
      of sortedMiners
    ) {
      if (
        !isObject(
          installedMiner
        )
      ) {
        continue;
      }

      const miner =
        installedMiner.miner;

      if (
        !isObject(
          miner
        )
      ) {
        continue;
      }

      const requiredPower =
        safeNumber(
          miner.powerUsage
        );

      const hashRate =
        safeNumber(
          miner.hashRate
        );

      // Invalid / zero-power hardware should not
      // accidentally generate rewards.

      if (
        requiredPower <= 0 ||
        hashRate <= 0
      ) {
        continue;
      }

      if (
        availablePower <
        requiredPower
      ) {
        continue;
      }

      availablePower -=
        requiredPower;

      powerUsed +=
        requiredPower;

      activeHashrate +=
        hashRate;
    }
  }

  return {
    activeHashrate,
    powerCapacity,
    powerUsed,
  };
}

// ======================================================
// CALCULATE OFFLINE REWARD
// ======================================================

function calculateOfflineMining(
  gameState: JsonObject,
  updatedAt: Date,
  now: Date
): OfflineMiningResult {
  const rawElapsed =
    Math.floor(
      (
        now.getTime() -
        updatedAt.getTime()
      ) /
        1000
    );

  const elapsedSeconds =
    Number.isFinite(
      rawElapsed
    )
      ? Math.max(
          0,
          rawElapsed
        )
      : 0;

  const capped =
    elapsedSeconds >
    MAX_OFFLINE_SECONDS;

  let rewardedSeconds =
    Math.min(
      elapsedSeconds,
      MAX_OFFLINE_SECONDS
    );

  if (
    rewardedSeconds <
    MIN_OFFLINE_SECONDS
  ) {
    rewardedSeconds =
      0;
  }

  const {
    activeHashrate,
    powerCapacity,
    powerUsed,
  } =
    calculateActiveMining(
      gameState
    );

  const tyconEarned =
    rewardedSeconds > 0 &&
    activeHashrate > 0
      ? activeHashrate *
        TYCON_PER_MH_PER_SECOND *
        rewardedSeconds
      : 0;

  return {
    elapsedSeconds,

    rewardedSeconds,

    capped,

    activeHashrate,

    powerCapacity,

    powerUsed,

    tyconEarned:
      Number.isFinite(
        tyconEarned
      )
        ? Math.max(
            0,
            tyconEarned
          )
        : 0,
  };
}

// ======================================================
// API
// ======================================================

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // ====================================================
  // METHOD
  // ====================================================

  if (
    req.method !== "GET"
  ) {
    res.setHeader(
      "Allow",
      "GET"
    );

    return res
      .status(405)
      .json({
        ok: false,

        error:
          "Method not allowed.",
      });
  }

  // ====================================================
  // DATABASE URL
  // ====================================================

  const databaseUrl =
    process.env
      .DATABASE_POSTGRES_URL ??
    process.env
      .DATABASE_URL_UNPOOLED;

  if (
    !databaseUrl
  ) {
    console.error(
      "Database environment variable missing."
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          "Database is not configured.",
      });
  }

  // ====================================================
  // WALLET
  // ====================================================

  const walletParam =
    req.query?.wallet;

  const wallet =
    Array.isArray(
      walletParam
    )
      ? walletParam[0]
      : walletParam;

  if (
    !wallet ||
    !isValidWallet(
      wallet
    )
  ) {
    return res
      .status(400)
      .json({
        ok: false,

        error:
          "Invalid wallet address.",
      });
  }

  const normalizedWallet =
    wallet.toLowerCase();

  // ====================================================
  // DATABASE
  // ====================================================

  try {
    const sql =
      neon(
        databaseUrl
      );

    // ==================================================
    // CREATE TABLE IF NEEDED
    // ==================================================

    await sql`
      CREATE TABLE IF NOT EXISTS game_saves (
        wallet_address TEXT PRIMARY KEY,
        game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // ==================================================
    // LOAD SAVE
    //
    // Also fetch PostgreSQL NOW().
    //
    // Both timestamps therefore come from the database
    // clock instead of the player's browser clock.
    // ==================================================

    const rows =
      await sql`
        SELECT
          wallet_address,
          game_state,
          created_at,
          updated_at,
          NOW() AS server_now
        FROM game_saves
        WHERE wallet_address =
          ${normalizedWallet}
        LIMIT 1
      `;

    // ==================================================
    // NEW PLAYER
    // ==================================================

    if (
      rows.length === 0
    ) {
      return res
        .status(200)
        .json({
          ok: true,

          exists: false,

          wallet:
            normalizedWallet,

          gameState:
            null,

          offlineMining:
            null,
        });
    }

    // ==================================================
    // EXISTING PLAYER
    // ==================================================

    const save =
      rows[0];

    const rawState =
      save.game_state;

    const gameState:
      JsonObject =
      isObject(
        rawState
      )
        ? {
            ...rawState,
          }
        : {};

    const updatedAt =
      new Date(
        save.updated_at
      );

    const serverNow =
      new Date(
        save.server_now
      );

    // ==================================================
    // OFFLINE MINING
    // ==================================================

    const offlineMining =
      calculateOfflineMining(
        gameState,
        updatedAt,
        serverNow
      );

    // ==================================================
    // APPLY OFFLINE REWARD
    // ==================================================

    const previousBalance =
      safeNumber(
        gameState.tyconBalance
      );

    const previousTotalMined =
      safeNumber(
        gameState.totalMined
      );

    if (
      offlineMining.tyconEarned >
      0
    ) {
      gameState.tyconBalance =
        previousBalance +
        offlineMining.tyconEarned;

      gameState.totalMined =
        previousTotalMined +
        offlineMining.tyconEarned;
    } else {
      // Normalize these values even when no reward
      // was generated.

      gameState.tyconBalance =
        previousBalance;

      gameState.totalMined =
        previousTotalMined;
    }

    // Client still uses this field for save metadata.
    // Use server time here.

    gameState.updatedAt =
      serverNow.getTime();

    // ==================================================
    // CONSUME OFFLINE PERIOD
    //
    // IMPORTANT:
    //
    // We update updated_at on LOAD.
    //
    // Therefore refreshing/reloading immediately cannot
    // claim the same offline period a second time.
    // ==================================================

    const serializedState =
      JSON.stringify(
        gameState
      );

    const updatedRows =
      await sql`
        UPDATE game_saves

        SET
          game_state =
            ${serializedState}::jsonb,

          updated_at =
            NOW()

        WHERE
          wallet_address =
            ${normalizedWallet}

        RETURNING
          wallet_address,
          game_state,
          created_at,
          updated_at
      `;

    const updatedSave =
      updatedRows[0];

    if (
      !updatedSave
    ) {
      throw new Error(
        "Save disappeared during offline mining update."
      );
    }

    // ==================================================
    // LOG
    // ==================================================

    console.log(
      "Offline mining processed:",

      normalizedWallet,

      "| elapsed:",
      offlineMining.elapsedSeconds,
      "seconds",

      "| rewarded:",
      offlineMining.rewardedSeconds,
      "seconds",

      "| hashrate:",
      offlineMining.activeHashrate,
      "MH/s",

      "| power:",
      offlineMining.powerUsed,
      "/",
      offlineMining.powerCapacity,
      "W",

      "| TYCON:",
      offlineMining.tyconEarned
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res
      .status(200)
      .json({
        ok: true,

        exists: true,

        wallet:
          updatedSave.wallet_address,

        gameState:
          updatedSave.game_state,

        createdAt:
          updatedSave.created_at,

        updatedAt:
          updatedSave.updated_at,

        offlineMining,
      });
  } catch (error) {
    console.error(
      "Load game save failed:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          "Could not load game save.",
      });
  }
}
