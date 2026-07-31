import {
  randomBytes,
} from "node:crypto";

// ======================================================
// MINING TYCOON 3D
// AUTH - NONCE ENDPOINT
// ======================================================
//
// Endpoint:
//
// GET /api/auth/nonce
//
// Purpose:
//
// Generate a cryptographically random nonce that will
// later be included inside the wallet login message.
//
// IMPORTANT:
//
// This is only step 1 of authentication.
// The next endpoint will verify the wallet signature.
// ======================================================

// ======================================================
// VERCEL REQUEST / RESPONSE TYPES
//
// We keep these minimal so we do not need another
// dependency just for Vercel request types.
// ======================================================

type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status: (
    statusCode: number
  ) => VercelResponse;

  setHeader: (
    name: string,
    value: string
  ) => void;

  json: (
    body: unknown
  ) => void;
};

// ======================================================
// CREATE NONCE
// ======================================================

function createNonce():
  string {
  return randomBytes(
    32
  ).toString(
    "hex"
  );
}

// ======================================================
// API HANDLER
// ======================================================

export default function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // ====================================================
  // METHOD CHECK
  // ====================================================

  if (
    request.method !==
    "GET"
  ) {
    response.setHeader(
      "Allow",
      "GET"
    );

    return response
      .status(405)
      .json({
        success: false,

        error:
          "Method not allowed.",
      });
  }

  // ====================================================
  // GENERATE NONCE
  // ====================================================

  const nonce =
    createNonce();

  // ====================================================
  // DO NOT CACHE AUTH NONCES
  // ====================================================

  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  // ====================================================
  // RESPONSE
  // ====================================================

  return response
    .status(200)
    .json({
      success: true,

      nonce,
    });
}
