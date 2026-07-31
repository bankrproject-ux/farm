import {
  recoverMessageAddress,
  type Address,
  isAddress,
} from "viem";

// ======================================================
// MINING TYCOON 3D
// AUTH - VERIFY WALLET SIGNATURE
// ======================================================
//
// POST /api/auth/verify
//
// Receives:
//
// {
//   address: "0x...",
//   message: "...",
//   signature: "0x..."
// }
//
// The server recovers the address that signed the
// message and compares it against the claimed wallet.
// ======================================================

// ======================================================
// REQUEST / RESPONSE TYPES
// ======================================================

type VerifyBody = {
  address?: string;

  message?: string;

  signature?: string;
};

type VercelRequest = {
  method?: string;

  body?: VerifyBody;
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
// HANDLER
// ======================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // ====================================================
  // METHOD
  // ====================================================

  if (
    request.method !==
    "POST"
  ) {
    response.setHeader(
      "Allow",
      "POST"
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
  // BODY
  // ====================================================

  const body =
    request.body ?? {};

  const {
    address,
    message,
    signature,
  } = body;

  // ====================================================
  // VALIDATE FIELDS
  // ====================================================

  if (
    !address ||
    !message ||
    !signature
  ) {
    return response
      .status(400)
      .json({
        success: false,

        error:
          "Missing address, message, or signature.",
      });
  }

  // ====================================================
  // VALIDATE ADDRESS
  // ====================================================

  if (
    !isAddress(
      address
    )
  ) {
    return response
      .status(400)
      .json({
        success: false,

        error:
          "Invalid wallet address.",
      });
  }

  // ====================================================
  // BASIC MESSAGE VALIDATION
  //
  // For now we require our game name to be present.
  // Later AuthManager will generate the exact login
  // message containing nonce + timestamp/domain.
  // ====================================================

  if (
    !message.includes(
      "Mining Tycoon"
    )
  ) {
    return response
      .status(400)
      .json({
        success: false,

        error:
          "Invalid login message.",
      });
  }

  // ====================================================
  // VERIFY SIGNATURE
  // ====================================================

  try {
    const recoveredAddress =
      await recoverMessageAddress({
        message,

        signature:
          signature as `0x${string}`,
      });

    // ==================================================
    // COMPARE ADDRESS
    // ==================================================

    const expected =
      address.toLowerCase();

    const recovered =
      recoveredAddress.toLowerCase();

    if (
      recovered !==
      expected
    ) {
      return response
        .status(401)
        .json({
          success: false,

          error:
            "Wallet signature does not match address.",
        });
    }

    // ==================================================
    // VERIFIED
    // ==================================================

    return response
      .status(200)
      .json({
        success: true,

        authenticated: true,

        address:
          recoveredAddress as Address,
      });
  } catch (error) {
    console.error(
      "Wallet verification failed:",
      error
    );

    return response
      .status(401)
      .json({
        success: false,

        authenticated: false,

        error:
          "Invalid wallet signature.",
      });
  }
}
