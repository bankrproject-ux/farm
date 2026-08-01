import { neon } from "@neondatabase/serverless";

import {
  recoverMessageAddress,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  parseUnits,
  formatUnits,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";

// ======================================================
// MINING TYCOON 3D
// BANK - WITHDRAW TYCON
// ======================================================
//
// POST /api/bank/withdraw
//
// Receives:
//
// {
//   wallet:    "0x...",
//   amount:    123.4567,
//   nonce:     "hex from /api/auth/nonce",
//   signature: "0x..."
// }
//
// Flow:
//
// 1. Validate input
// 2. Rebuild the exact message server side
// 3. Recover signer and compare with wallet
// 4. Reserve the nonce (anti replay)
// 5. Deduct game TYCON atomically in game_saves
// 6. Mint TYCON on chain using the minter wallet
// 7. Refund the game balance if the mint failed
// 8. Return tx hash + new balance
//
// IMPORTANT:
//
// The message is NEVER taken from the client.
// The client only sends wallet, amount, nonce.
// The server rebuilds the message itself so a signature
// can only ever authorize the exact amount it was
// created for.
// ======================================================

// ======================================================
// ENVIRONMENT
// ======================================================
//
// DATABASE_POSTGRES_URL   (already used by save/load)
// DATABASE_URL_UNPOOLED   (fallback)
//
// TYCON_TOKEN_ADDRESS     ERC20 contract on Robinhood
// MINTER_PRIVATE_KEY      0x + 64 hex, the minter wallet
//
// TYCON_DECIMALS          optional, default 18
// ROBINHOOD_RPC_URL       optional, default public RPC
// ======================================================

// ======================================================
// TYPES
// ======================================================

type WithdrawBody = {
  wallet?: unknown;

  amount?: unknown;

  nonce?: unknown;

  signature?: unknown;
};

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
// RULES
// ======================================================

const MINIMUM_WITHDRAW = 50;

const MAXIMUM_WITHDRAW = 1_000_000;

// Balance is displayed with 4 decimals in the HUD,
// so withdraws are locked to the same precision.
const AMOUNT_DECIMALS = 4;

// ======================================================
// ROBINHOOD CHAIN
// ======================================================

const ROBINHOOD_CHAIN_ID = 4663;

const DEFAULT_RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,

  name: "Robinhood Chain",

  nativeCurrency: {
    name: "Ether",

    symbol: "ETH",

    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [
        process.env.ROBINHOOD_RPC_URL ??
          DEFAULT_RPC_URL,
      ],
    },
  },

  blockExplorers: {
    default: {
      name: "Blockscout",

      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

// ======================================================
// MINIMAL ERC20 MINT ABI
// ======================================================

const MINT_ABI = [
  {
    type: "function",

    name: "mint",

    stateMutability: "nonpayable",

    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],

    outputs: [],
  },
] as const;

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
// NONCE VALIDATION
// ======================================================
//
// /api/auth/nonce returns 32 random bytes as hex,
// which is 64 characters.
// We accept 16 to 128 hex chars so the endpoint stays
// usable if the nonce size ever changes.
// ======================================================

function isValidNonce(
  nonce: string
): boolean {
  return /^[a-fA-F0-9]{16,128}$/.test(
    nonce
  );
}

// ======================================================
// SIGNATURE VALIDATION
// ======================================================

function isValidSignature(
  signature: string
): boolean {
  return /^0x[a-fA-F0-9]{130}$/.test(
    signature
  );
}

// ======================================================
// AMOUNT NORMALIZATION
// ======================================================
//
// Accepts number or numeric string.
// Rounds down to 4 decimals so the player can never
// withdraw more than what is actually deducted.
// ======================================================

function normalizeAmount(
  value: unknown
): number | null {
  const raw =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (
    !Number.isFinite(raw) ||
    raw <= 0
  ) {
    return null;
  }

  const factor = Math.pow(
    10,
    AMOUNT_DECIMALS
  );

  const floored =
    Math.floor(raw * factor) / factor;

  if (
    floored < MINIMUM_WITHDRAW ||
    floored > MAXIMUM_WITHDRAW
  ) {
    return null;
  }

  return floored;
}

// ======================================================
// WITHDRAW MESSAGE
// ======================================================
//
// This is the ONLY message the server will accept.
// It must contain "Mining Tycoon" so it stays
// consistent with api/auth/verify.ts.
//
// The frontend must build the exact same string.
// ======================================================

export function buildWithdrawMessage(
  wallet: string,
  amount: number,
  nonce: string
): string {
  return [
    "Mining Tycoon 3D",
    "",
    "Withdraw TYCON",
    "",
    `Wallet: ${wallet.toLowerCase()}`,
    `Amount: ${amount.toFixed(
      AMOUNT_DECIMALS
    )} TYCON`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

// ======================================================
// TOKEN DECIMALS
// ======================================================

function getTokenDecimals(): number {
  const raw = Number(
    process.env.TYCON_DECIMALS ?? "18"
  );

  if (
    !Number.isInteger(raw) ||
    raw < 0 ||
    raw > 36
  ) {
    return 18;
  }

  return raw;
}

// ======================================================
// HANDLER
// ======================================================

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // ====================================================
  // METHOD
  // ====================================================

  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      ok: false,

      error: "Method not allowed.",
    });
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  // ====================================================
  // DATABASE CONFIG
  // ====================================================

  const databaseUrl =
    process.env.DATABASE_POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED;

  if (!databaseUrl) {
    console.error(
      "Database environment variable missing."
    );

    return res.status(500).json({
      ok: false,

      error:
        "Database is not configured.",
    });
  }

  // ====================================================
  // CHAIN CONFIG
  // ====================================================

  const tokenAddress =
    process.env.TYCON_TOKEN_ADDRESS ?? "";

  const minterKey =
    process.env.MINTER_PRIVATE_KEY ?? "";

  if (!isValidWallet(tokenAddress)) {
    console.error(
      "TYCON_TOKEN_ADDRESS is missing or invalid."
    );

    return res.status(500).json({
      ok: false,

      error:
        "Token contract is not configured.",
    });
  }

  if (
    !/^0x[a-fA-F0-9]{64}$/.test(
      minterKey
    )
  ) {
    console.error(
      "MINTER_PRIVATE_KEY is missing or invalid."
    );

    return res.status(500).json({
      ok: false,

      error:
        "Minter wallet is not configured.",
    });
  }

  // ====================================================
  // BODY
  // ====================================================

  const body =
    req.body &&
    typeof req.body === "object"
      ? (req.body as WithdrawBody)
      : {};

  const wallet =
    typeof body.wallet === "string"
      ? body.wallet
      : "";

  const nonce =
    typeof body.nonce === "string"
      ? body.nonce
      : "";

  const signature =
    typeof body.signature === "string"
      ? body.signature
      : "";

  // ====================================================
  // VALIDATE WALLET
  // ====================================================

  if (
    !isValidWallet(wallet) ||
    !isAddress(wallet)
  ) {
    return res.status(400).json({
      ok: false,

      error: "Invalid wallet address.",
    });
  }

  // ====================================================
  // VALIDATE NONCE
  // ====================================================

  if (!isValidNonce(nonce)) {
    return res.status(400).json({
      ok: false,

      error: "Invalid nonce.",
    });
  }

  // ====================================================
  // VALIDATE SIGNATURE FORMAT
  // ====================================================

  if (!isValidSignature(signature)) {
    return res.status(400).json({
      ok: false,

      error: "Invalid signature.",
    });
  }

  // ====================================================
  // VALIDATE AMOUNT
  // ====================================================

  const amount = normalizeAmount(
    body.amount
  );

  if (amount === null) {
    return res.status(400).json({
      ok: false,

      error: `Withdraw amount must be between ${MINIMUM_WITHDRAW} and ${MAXIMUM_WITHDRAW} TYCON.`,
    });
  }

  const normalizedWallet =
    wallet.toLowerCase();

  // ====================================================
  // VERIFY SIGNATURE
  // ====================================================

  const expectedMessage =
    buildWithdrawMessage(
      normalizedWallet,
      amount,
      nonce
    );

  try {
    const recovered =
      await recoverMessageAddress({
        message: expectedMessage,

        signature:
          signature as `0x${string}`,
      });

    if (
      recovered.toLowerCase() !==
      normalizedWallet
    ) {
      return res.status(401).json({
        ok: false,

        error:
          "Wallet signature does not match address.",
      });
    }
  } catch (error) {
    console.error(
      "Withdraw signature verification failed:",
      error
    );

    return res.status(401).json({
      ok: false,

      error: "Invalid wallet signature.",
    });
  }

  // ====================================================
  // DATABASE
  // ====================================================

  const sql = neon(databaseUrl);

  // ====================================================
  // WITHDRAW LEDGER TABLE
  // ====================================================
  //
  // nonce is the PRIMARY KEY.
  //
  // That single constraint is what makes a replay
  // impossible: the same signature carries the same
  // nonce, and the second insert will always fail.
  // ====================================================

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tycon_withdrawals (
        nonce TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        amount NUMERIC(30, 8) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        tx_hash TEXT,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS
        tycon_withdrawals_wallet_idx
      ON tycon_withdrawals (
        wallet_address,
        created_at DESC
      )
    `;
  } catch (error) {
    console.error(
      "Could not prepare withdrawal table:",
      error
    );

    return res.status(500).json({
      ok: false,

      error:
        "Withdrawal service is unavailable.",
    });
  }

  // ====================================================
  // RESERVE NONCE
  // ====================================================
  //
  // Done BEFORE touching the balance.
  //
  // If two requests arrive at the same moment with the
  // same signature, only one of them survives here.
  // ====================================================

  try {
    const reserved = await sql`
      INSERT INTO tycon_withdrawals (
        nonce,
        wallet_address,
        amount,
        status
      )
      VALUES (
        ${nonce},
        ${normalizedWallet},
        ${amount},
        'pending'
      )

      ON CONFLICT (nonce)
      DO NOTHING

      RETURNING nonce
    `;

    if (reserved.length === 0) {
      return res.status(409).json({
        ok: false,

        error:
          "This withdrawal request was already used.",
      });
    }
  } catch (error) {
    console.error(
      "Could not reserve withdrawal nonce:",
      error
    );

    return res.status(500).json({
      ok: false,

      error: "Could not start withdrawal.",
    });
  }

  // ====================================================
  // DEDUCT GAME BALANCE
  // ====================================================
  //
  // Single atomic UPDATE.
  //
  // The WHERE clause carries the balance check, so the
  // read and the write cannot drift apart even under
  // concurrent requests.
  // ====================================================

  let newBalance = 0;

  try {
    const updated = await sql`
      UPDATE game_saves
      SET
        game_state = jsonb_set(
          game_state,
          '{tyconBalance}',
          to_jsonb(
            ROUND(
              COALESCE(
                (game_state ->> 'tyconBalance')::numeric,
                0
              ) - ${amount}::numeric,
              8
            )
          ),
          true
        ),

        updated_at = NOW()

      WHERE
        wallet_address = ${normalizedWallet}
        AND COALESCE(
          (game_state ->> 'tyconBalance')::numeric,
          0
        ) >= ${amount}::numeric

      RETURNING
        (game_state ->> 'tyconBalance')::numeric
          AS balance
    `;

    if (updated.length === 0) {
      await sql`
        UPDATE tycon_withdrawals
        SET
          status = 'rejected',
          error = 'Insufficient balance.',
          updated_at = NOW()
        WHERE nonce = ${nonce}
      `;

      return res.status(400).json({
        ok: false,

        error:
          "Insufficient TYCON balance.",
      });
    }

    newBalance = Number(
      updated[0].balance
    );

    if (
      !Number.isFinite(newBalance) ||
      newBalance < 0
    ) {
      newBalance = 0;
    }
  } catch (error) {
    console.error(
      "Could not deduct game balance:",
      error
    );

    await sql`
      UPDATE tycon_withdrawals
      SET
        status = 'failed',
        error = 'Balance update failed.',
        updated_at = NOW()
      WHERE nonce = ${nonce}
    `.catch(() => undefined);

    return res.status(500).json({
      ok: false,

      error:
        "Could not update game balance.",
    });
  }

  // ====================================================
  // MINT ON CHAIN
  // ====================================================

  const decimals = getTokenDecimals();

  const onChainAmount = parseUnits(
    amount.toFixed(AMOUNT_DECIMALS),
    decimals
  );

  let txHash: string;

  try {
    const minterAccount =
      privateKeyToAccount(
        minterKey as `0x${string}`
      );

    const walletClient =
      createWalletClient({
        account: minterAccount,

        chain: robinhoodChain,

        transport: http(
          process.env.ROBINHOOD_RPC_URL ??
            DEFAULT_RPC_URL
        ),
      });

    txHash =
      await walletClient.writeContract({
        address:
          tokenAddress as `0x${string}`,

        abi: MINT_ABI,

        functionName: "mint",

        args: [
          normalizedWallet as `0x${string}`,

          onChainAmount,
        ],
      });
  } catch (error) {
    // ==================================================
    // MINT FAILED -> REFUND
    // ==================================================
    //
    // The player never received tokens, so the game
    // balance goes straight back.
    // ==================================================

    console.error(
      "TYCON mint failed:",
      error
    );

    const failureReason =
      error instanceof Error
        ? error.message.slice(0, 400)
        : "Unknown mint error.";

    let refunded = false;

    try {
      const restored = await sql`
        UPDATE game_saves
        SET
          game_state = jsonb_set(
            game_state,
            '{tyconBalance}',
            to_jsonb(
              ROUND(
                COALESCE(
                  (game_state ->> 'tyconBalance')::numeric,
                  0
                ) + ${amount}::numeric,
                8
              )
            ),
            true
          ),

          updated_at = NOW()

        WHERE
          wallet_address = ${normalizedWallet}

        RETURNING
          (game_state ->> 'tyconBalance')::numeric
            AS balance
      `;

      if (restored.length > 0) {
        refunded = true;

        newBalance = Number(
          restored[0].balance
        );
      }
    } catch (refundError) {
      console.error(
        "CRITICAL: could not refund game balance:",
        refundError
      );
    }

    await sql`
      UPDATE tycon_withdrawals
      SET
        status = ${
          refunded
            ? "refunded"
            : "failed"
        },
        error = ${failureReason},
        updated_at = NOW()
      WHERE nonce = ${nonce}
    `.catch(() => undefined);

    return res.status(502).json({
      ok: false,

      error: refunded
        ? "Minting failed. Your TYCON balance was restored."
        : "Minting failed. Please contact support with your nonce.",

      balance: newBalance,

      nonce,
    });
  }

  // ====================================================
  // RECORD SUCCESS
  // ====================================================

  await sql`
    UPDATE tycon_withdrawals
    SET
      status = 'sent',
      tx_hash = ${txHash},
      updated_at = NOW()
    WHERE nonce = ${nonce}
  `.catch((error) => {
    console.error(
      "Could not record withdrawal tx hash:",
      error
    );
  });

  // ====================================================
  // RESPONSE
  // ====================================================

  return res.status(200).json({
    ok: true,

    wallet: normalizedWallet,

    amount,

    balance: newBalance,

    txHash,

    explorerUrl: `https://robinhoodchain.blockscout.com/tx/${txHash}`,

    minted: formatUnits(
      onChainAmount,
      decimals
    ),
  });
}
