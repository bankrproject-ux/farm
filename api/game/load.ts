import {
  neon,
} from "@neondatabase/serverless";

// ======================================================
// MINING TYCOON 3D
// LOAD GAME SAVE
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
    !isValidWallet(wallet)
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
      neon(databaseUrl);

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
    // ==================================================

    const rows =
      await sql`
        SELECT
          wallet_address,
          game_state,
          created_at,
          updated_at
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

          gameState: null,
        });
    }

    // ==================================================
    // EXISTING PLAYER
    // ==================================================

    const save =
      rows[0];

    return res
      .status(200)
      .json({
        ok: true,

        exists: true,

        wallet:
          save.wallet_address,

        gameState:
          save.game_state,

        createdAt:
          save.created_at,

        updatedAt:
          save.updated_at,
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
