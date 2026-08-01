import GameState from "../game/GameState";
import WalletManager from "../wallet/WalletManager";

// ======================================================
// MINING TYCOON 3D
// BANK UI
// ======================================================
//
// HUD button -> modal -> withdraw TYCON on chain.
//
// Flow:
//
// 1. Player types an amount
// 2. GET /api/auth/nonce
// 3. Wallet signs the withdraw message
// 4. POST /api/bank/withdraw
// 5. Backend verifies, deducts, mints
// 6. Success popup with tx hash
//
// The signed message MUST match the string built by
// buildWithdrawMessage() in api/bank/withdraw.ts,
// character for character.
// ======================================================

// ======================================================
// RULES
// ======================================================

const MINIMUM_WITHDRAW = 50;

const MAXIMUM_WITHDRAW = 1_000_000;

const AMOUNT_DECIMALS = 4;

const EXPLORER_URL =
  "https://robinhoodchain.blockscout.com";

// ======================================================
// WITHDRAW RESPONSE
// ======================================================

type WithdrawResponse = {
  ok?: boolean;

  error?: string;

  amount?: number;

  balance?: number;

  txHash?: string;

  explorerUrl?: string;
};

// ======================================================
// WITHDRAW SUCCESS PAYLOAD
// ======================================================
//
// main.ts uses this to sync GameState with the balance
// the server actually wrote, then force a save.
// ======================================================

export type BankWithdrawSuccess = {
  amount: number;

  balance: number;

  txHash: string;
};

// ======================================================
// STYLES
// ======================================================
//
// Injected once so src/style.css stays untouched.
// ======================================================

const BANK_STYLE_ID =
  "bank-ui-styles";

const BANK_STYLES = `
.bank-open-button {
  position: fixed;
  top: 132px;
  right: 24px;
  z-index: 40;
  padding: 12px 22px;
  border: 1px solid rgba(120, 220, 180, 0.45);
  border-radius: 10px;
  background: rgba(12, 22, 20, 0.9);
  color: #7fe9c0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  cursor: pointer;
  transition: background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.bank-open-button:hover {
  background: rgba(20, 40, 34, 0.95);
  border-color: rgba(140, 240, 200, 0.8);
  transform: translateY(-1px);
}

.bank-window {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 8, 12, 0.78);
  backdrop-filter: blur(6px);
}

.bank-window.hidden {
  display: none;
}

.bank-panel {
  width: min(420px, calc(100vw - 40px));
  padding: 28px;
  border: 1px solid rgba(120, 220, 180, 0.28);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(16, 26, 24, 0.98),
    rgba(8, 14, 16, 0.98)
  );
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  color: #e6f4ef;
  font-family: inherit;
}

.bank-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: #7fe9c0;
  text-align: center;
  margin-bottom: 22px;
}

.bank-balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 20px;
}

.bank-balance span {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(230, 244, 239, 0.5);
}

.bank-balance strong {
  font-size: 16px;
  color: #7fe9c0;
}

.bank-input label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(230, 244, 239, 0.5);
  margin-bottom: 8px;
}

.bank-input input {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  color: #e6f4ef;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
}

.bank-input input:focus {
  border-color: rgba(140, 240, 200, 0.6);
}

.bank-input input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bank-max {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.bank-max button {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: transparent;
  color: rgba(230, 244, 239, 0.7);
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.12em;
  cursor: pointer;
}

.bank-max button:hover {
  color: #7fe9c0;
  border-color: rgba(140, 240, 200, 0.5);
}

.bank-minimum {
  margin: 14px 0 20px;
  font-size: 11px;
  color: rgba(230, 244, 239, 0.45);
  text-align: center;
}

.bank-minimum strong {
  color: rgba(230, 244, 239, 0.8);
}

.bank-status {
  min-height: 18px;
  margin-bottom: 14px;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
  color: rgba(230, 244, 239, 0.6);
}

.bank-status.error {
  color: #ff8f8f;
}

.bank-status.success {
  color: #7fe9c0;
}

.bank-status a {
  color: #7fe9c0;
  word-break: break-all;
}

.bank-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bank-buttons button {
  padding: 13px 0;
  border-radius: 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: opacity 0.18s ease,
    background 0.18s ease;
}

#bank-withdraw {
  border: 1px solid rgba(140, 240, 200, 0.7);
  background: rgba(40, 90, 74, 0.85);
  color: #d9fff1;
}

#bank-withdraw:hover:not(:disabled) {
  background: rgba(52, 116, 95, 0.95);
}

#bank-withdraw:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

#bank-close {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(230, 244, 239, 0.7);
}

#bank-close:hover {
  background: rgba(255, 255, 255, 0.06);
}
`;

// ======================================================
// BANK UI
// ======================================================

export default class BankUI {
  private root: HTMLDivElement;

  private balanceLabel: HTMLElement;

  private amountInput: HTMLInputElement;

  private withdrawButton: HTMLButtonElement;

  private closeButton: HTMLButtonElement;

  private maxButton: HTMLButtonElement;

  private statusLabel: HTMLElement;

  private openButton: HTMLButtonElement;

  private isOpen = false;

  private busy = false;

  constructor(
    private readonly wallet: WalletManager,
    private readonly gameState: GameState,
    private readonly onWithdrawSuccess?: (
      result: BankWithdrawSuccess
    ) => void
  ) {
    // ==================================================
    // STYLES
    // ==================================================

    BankUI.injectStyles();

    // ==================================================
    // OPEN BUTTON
    // ==================================================

    this.openButton =
      document.createElement("button");

    this.openButton.className =
      "bank-open-button";

    this.openButton.textContent = "BANK";

    document.body.appendChild(
      this.openButton
    );

    // ==================================================
    // WINDOW
    // ==================================================

    this.root =
      document.createElement("div");

    this.root.className =
      "bank-window hidden";

    this.root.innerHTML = `
      <div class="bank-panel">

        <div class="bank-title">
          TYCON BANK
        </div>

        <div class="bank-balance">

          <span>
            GAME BALANCE
          </span>

          <strong id="bank-balance">
            0 TYCON
          </strong>

        </div>

        <div class="bank-input">

          <label>
            Withdraw Amount
          </label>

          <input
            id="bank-input"
            type="number"
            min="50"
            step="0.0001"
            placeholder="50"
          />

          <div class="bank-max">
            <button id="bank-max">
              MAX
            </button>
          </div>

        </div>

        <div class="bank-minimum">

          Minimum Withdraw

          <strong>
            50 TYCON
          </strong>

        </div>

        <div
          id="bank-status"
          class="bank-status"
        ></div>

        <div class="bank-buttons">

          <button id="bank-withdraw">
            WITHDRAW
          </button>

          <button id="bank-close">
            CLOSE
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      this.root
    );

    this.balanceLabel =
      this.root.querySelector(
        "#bank-balance"
      )!;

    this.amountInput =
      this.root.querySelector(
        "#bank-input"
      )!;

    this.withdrawButton =
      this.root.querySelector(
        "#bank-withdraw"
      )!;

    this.closeButton =
      this.root.querySelector(
        "#bank-close"
      )!;

    this.maxButton =
      this.root.querySelector(
        "#bank-max"
      )!;

    this.statusLabel =
      this.root.querySelector(
        "#bank-status"
      )!;

    // ==================================================
    // EVENTS
    // ==================================================

    this.openButton.onclick = () =>
      this.open();

    this.closeButton.addEventListener(
      "click",
      () => {
        if (this.busy) {
          return;
        }

        this.close();
      }
    );

    this.maxButton.addEventListener(
      "click",
      () => {
        if (this.busy) {
          return;
        }

        this.amountInput.value =
          BankUI.floorAmount(
            this.gameState.getTyconBalance()
          ).toFixed(AMOUNT_DECIMALS);
      }
    );

    this.withdrawButton.addEventListener(
      "click",
      async () => {
        await this.withdraw();
      }
    );

    // ==================================================
    // CLICK OUTSIDE TO CLOSE
    // ==================================================

    this.root.addEventListener(
      "click",
      (event) => {
        if (
          event.target === this.root &&
          !this.busy
        ) {
          this.close();
        }
      }
    );

    gameState.subscribe(() =>
      this.refresh()
    );

    this.refresh();
  }

  // ====================================================
  // INJECT STYLES
  // ====================================================

  private static injectStyles() {
    if (
      document.getElementById(
        BANK_STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = BANK_STYLE_ID;

    style.textContent = BANK_STYLES;

    document.head.appendChild(style);
  }

  // ====================================================
  // FLOOR TO 4 DECIMALS
  // ====================================================
  //
  // Matches normalizeAmount() on the server, so the
  // client can never sign an amount the backend would
  // silently round down.
  // ====================================================

  private static floorAmount(
    value: number
  ): number {
    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 0;
    }

    const factor = Math.pow(
      10,
      AMOUNT_DECIMALS
    );

    return (
      Math.floor(value * factor) / factor
    );
  }

  // ====================================================
  // BUILD WITHDRAW MESSAGE
  // ====================================================
  //
  // MUST stay identical to
  // buildWithdrawMessage() in api/bank/withdraw.ts
  // ====================================================

  private static buildWithdrawMessage(
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

  // ====================================================
  // OPEN / CLOSE
  // ====================================================

  public isOpened() {
    return this.isOpen;
  }

  public open() {
    this.refresh();

    this.setStatus("");

    this.isOpen = true;

    this.root.classList.remove(
      "hidden"
    );
  }

  public close() {
    this.isOpen = false;

    this.root.classList.add("hidden");
  }

  // ====================================================
  // REFRESH
  // ====================================================

  private refresh() {
    this.balanceLabel.textContent = `${this.gameState
      .getTyconBalance()
      .toLocaleString("en-US", {
        minimumFractionDigits:
          AMOUNT_DECIMALS,
        maximumFractionDigits:
          AMOUNT_DECIMALS,
      })} TYCON`;
  }

  // ====================================================
  // STATUS
  // ====================================================

  private setStatus(
    message: string,
    kind:
      | "info"
      | "error"
      | "success" = "info",
    html = false
  ) {
    this.statusLabel.className =
      kind === "info"
        ? "bank-status"
        : `bank-status ${kind}`;

    if (html) {
      this.statusLabel.innerHTML =
        message;
    } else {
      this.statusLabel.textContent =
        message;
    }
  }

  // ====================================================
  // BUSY STATE
  // ====================================================

  private setBusy(busy: boolean) {
    this.busy = busy;

    this.withdrawButton.disabled = busy;

    this.amountInput.disabled = busy;

    this.withdrawButton.textContent =
      busy ? "PROCESSING..." : "WITHDRAW";
  }

  // ====================================================
  // WITHDRAW
  // ====================================================

  private async withdraw() {
    if (this.busy) {
      return;
    }

    // ==================================================
    // WALLET
    // ==================================================

    const address =
      this.wallet.getAddress();

    if (!address) {
      this.setStatus(
        "Wallet is not connected.",
        "error"
      );

      return;
    }

    // ==================================================
    // AMOUNT
    // ==================================================

    const amount = BankUI.floorAmount(
      Number(this.amountInput.value)
    );

    if (amount < MINIMUM_WITHDRAW) {
      this.setStatus(
        `Minimum withdraw is ${MINIMUM_WITHDRAW} TYCON.`,
        "error"
      );

      return;
    }

    if (amount > MAXIMUM_WITHDRAW) {
      this.setStatus(
        `Maximum withdraw is ${MAXIMUM_WITHDRAW.toLocaleString(
          "en-US"
        )} TYCON.`,
        "error"
      );

      return;
    }

    if (
      amount >
      this.gameState.getTyconBalance()
    ) {
      this.setStatus(
        "Insufficient TYCON balance.",
        "error"
      );

      return;
    }

    this.setBusy(true);

    try {
      // ================================================
      // 1. NONCE
      // ================================================

      this.setStatus(
        "Preparing withdrawal..."
      );

      const nonceResponse = await fetch(
        "/api/auth/nonce",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const noncePayload =
        (await nonceResponse.json()) as {
          success?: boolean;
          nonce?: string;
        };

      if (
        !nonceResponse.ok ||
        !noncePayload.success ||
        typeof noncePayload.nonce !==
          "string"
      ) {
        this.setStatus(
          "Could not start withdrawal. Please try again.",
          "error"
        );

        return;
      }

      const nonce = noncePayload.nonce;

      // ================================================
      // 2. SIGN
      // ================================================

      this.setStatus(
        "Confirm the signature in your wallet..."
      );

      const message =
        BankUI.buildWithdrawMessage(
          address,
          amount,
          nonce
        );

      let signature: string;

      try {
        signature =
          await this.wallet.signMessage(
            message
          );
      } catch (error) {
        console.warn(
          "Withdraw signature rejected:",
          error
        );

        this.setStatus(
          "Signature was rejected.",
          "error"
        );

        return;
      }

      // ================================================
      // 3. BACKEND
      // ================================================

      this.setStatus(
        "Minting TYCON on chain..."
      );

      const response = await fetch(
        "/api/bank/withdraw",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            wallet: address,

            amount,

            nonce,

            signature,
          }),
        }
      );

      const payload =
        (await response.json()) as WithdrawResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.txHash
      ) {
        this.setStatus(
          payload.error ??
            "Withdrawal failed.",
          "error"
        );

        // Backend may have refunded and sent the
        // authoritative balance back.
        if (
          typeof payload.balance ===
          "number"
        ) {
          this.onWithdrawSuccess?.({
            amount: 0,

            balance: payload.balance,

            txHash: "",
          });
        }

        return;
      }

      // ================================================
      // 4. SUCCESS
      // ================================================

      const newBalance =
        typeof payload.balance ===
        "number"
          ? payload.balance
          : Math.max(
              0,
              this.gameState.getTyconBalance() -
                amount
            );

      this.onWithdrawSuccess?.({
        amount,

        balance: newBalance,

        txHash: payload.txHash,
      });

      this.amountInput.value = "";

      this.refresh();

      const explorerUrl =
        payload.explorerUrl ??
        `${EXPLORER_URL}/tx/${payload.txHash}`;

      this.setStatus(
        `Sent ${amount.toFixed(
          AMOUNT_DECIMALS
        )} TYCON to your wallet.<br /><a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">View transaction</a>`,
        "success",
        true
      );
    } catch (error) {
      console.error(
        "Withdraw failed:",
        error
      );

      this.setStatus(
        "Network error. Please try again.",
        "error"
      );
    } finally {
      this.setBusy(false);
    }
  }

  // ====================================================
  // DESTROY
  // ====================================================

  public destroy() {
    this.openButton.remove();

    this.root.remove();
  }
}
