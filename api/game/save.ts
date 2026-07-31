import {
  neon,
} from "@neondatabase/serverless";

// ======================================================
// MINING TYCOON 3D
// SAVE GAME STATE
// ======================================================

type ApiRequest = {
  method?: string;

  body?: unknown;
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
// REQUEST BODY
// ======================================================

type SaveRequestBody = {
  wallet?: unknown;

  gameState?: unknown;
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
// GAME STATE VALIDATION
// ======================================================

function isValidGameState(
  value: unknown
): value is Record<
  string,
  unknown
> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  return true;
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
    req.method !== "POST"
  ) {
    res.setHeader(
      "Allow",
      "POST"
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
  // DATABASE
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
  // BODY
  // ====================================================

  const body =
    (
      req.body &&
      typeof req.body === "object"
    )
      ? req.body as SaveRequestBody
      : {};

  const wallet =
    typeof body.wallet === "string"
      ? body.wallet
      : "";

  const gameState =
    body.gameState;

  // ====================================================
  // VALIDATE WALLET
  // ====================================================

  if (
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

  // ====================================================
  // VALIDATE STATE
  // ====================================================

  if (
    !isValidGameState(
      gameState
    )
  ) {
    return res
      .status(400)
      .json({
        ok: false,
        error:
          "Invalid game state.",
      });
  }

  // ====================================================
  // STATE SIZE LIMIT
  // ====================================================
  //
  // Prevent somebody from sending gigantic JSON payloads
  // into our database.
  //
  // 250 KB is already far more than this game's normal
  // save should need.
  // ====================================================

  let serializedState:
    string;

  try {
    serializedState =
      JSON.stringify(
        gameState
      );
  } catch {
    return res
      .status(400)
      .json({
        ok: false,
        error:
          "Game state could not be serialized.",
      });
  }

  const stateSize =
    new TextEncoder()
      .encode(
        serializedState
      )
      .length;

  if (
    stateSize >
    250_000
  ) {
    return res
      .status(413)
      .json({
        ok: false,
        error:
          "Game state is too large.",
      });
  }

  const normalizedWallet =
    wallet.toLowerCase();

  // ====================================================
  // DATABASE WRITE
  // ====================================================

  try {
    const sql =
      neon(databaseUrl);

    // ==================================================
    // CREATE TABLE
    // ==================================================
    //
    // Same schema as load.ts.
    // This means either endpoint can initialize a fresh
    // database.
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
    // UPSERT
    // ==================================================
    //
    // New wallet:
    // INSERT
    //
    // Existing wallet:
    // UPDATE game_state
    //
    // ==================================================

    const rows =
      await sql`
        INSERT INTO game_saves (
          wallet_address,
          game_state
        )
        VALUES (
          ${normalizedWallet},
          ${serializedState}::jsonb
        )

        ON CONFLICT (
          wallet_address
        )

        DO UPDATE SET
          game_state =
            EXCLUDED.game_state,

          updated_at =
            NOW()

        RETURNING
          wallet_address,
          created_at,
          updated_at
      `;

    const saved =
      rows[0];

    // ==================================================
    // SUCCESS
    // ==================================================

    return res
      .status(200)
      .json({
        ok: true,

        wallet:
          saved.wallet_address,

        createdAt:
          saved.created_at,

        updatedAt:
          saved.updated_at,
      });
  } catch (error) {
    console.error(
      "Save game failed:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          "Could not save game.",
      });
  }
}
