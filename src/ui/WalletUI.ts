import WalletManager, {
  type WalletState,
} from "../wallet/WalletManager";

// ======================================================
// MINING TYCOON 3D
// WALLET UI
// ======================================================

export default class WalletUI {
  private wallet:
    WalletManager;

  private container:
    HTMLDivElement;

  private button:
    HTMLButtonElement;

  private status:
    HTMLDivElement;

  private unsubscribe:
    (() => void) | null = null;

  private connecting = false;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor(
    wallet: WalletManager
  ) {
    this.wallet = wallet;

    // ==================================================
    // CONTAINER
    // ==================================================

    this.container =
      document.createElement(
        "div"
      );

    this.container.className =
      "wallet-ui";

    // ==================================================
    // STATUS
    // ==================================================

    this.status =
      document.createElement(
        "div"
      );

    this.status.className =
      "wallet-status";

    // ==================================================
    // BUTTON
    // ==================================================

    this.button =
      document.createElement(
        "button"
      );

    this.button.type =
      "button";

    this.button.className =
      "wallet-button";

    this.button.addEventListener(
      "click",
      () => {
        void this.handleClick();
      }
    );

    // ==================================================
    // ADD ELEMENTS
    // ==================================================

    this.container.appendChild(
      this.status
    );

    this.container.appendChild(
      this.button
    );

    document.body.appendChild(
      this.container
    );

    // ==================================================
    // SUBSCRIBE
    // ==================================================

    this.unsubscribe =
      this.wallet.subscribe(
        (state) => {
          this.render(
            state
          );
        }
      );
  }

  // ====================================================
  // CLICK
  // ====================================================

  private async handleClick() {
    if (
      this.connecting
    ) {
      return;
    }

    // --------------------------------------------------
    // ALREADY CONNECTED
    //
    // For now the button does nothing when connected.
    //
    // Later this can open an account panel containing:
    // - full wallet address
    // - chain
    // - logout/session controls
    // --------------------------------------------------

    if (
      this.wallet.isConnected()
    ) {
      return;
    }

    if (
      !this.wallet.isWalletAvailable()
    ) {
      this.showError(
        "NO EVM WALLET FOUND"
      );

      return;
    }

    this.connecting =
      true;

    this.button.disabled =
      true;

    this.button.textContent =
      "CONNECTING...";

    this.status.textContent =
      "WAITING FOR WALLET";

    try {
      await this.wallet.connect();
    } catch (error) {
      console.error(
        "Wallet connection failed:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Wallet connection failed.";

      this.showError(
        message
      );
    } finally {
      this.connecting =
        false;

      this.button.disabled =
        false;

      this.render(
        this.wallet.getState()
      );
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  private render(
    state: WalletState
  ) {
    if (
      this.connecting
    ) {
      return;
    }

    // ==================================================
    // DISCONNECTED
    // ==================================================

    if (
      !state.connected ||
      !state.address
    ) {
      this.container.classList.remove(
        "connected"
      );

      this.status.textContent =
        this.wallet.isWalletAvailable()
          ? "WALLET NOT CONNECTED"
          : "EVM WALLET NOT DETECTED";

      this.button.textContent =
        "CONNECT WALLET";

      this.button.disabled =
        false;

      return;
    }

    // ==================================================
    // CONNECTED
    // ==================================================

    this.container.classList.add(
      "connected"
    );

    this.status.textContent =
      this.getChainText(
        state.chainId
      );

    this.button.textContent =
      this.wallet.getShortAddress();

    this.button.disabled =
      false;
  }

  // ====================================================
  // CHAIN DISPLAY
  //
  // Identity is NOT tied to these chains.
  //
  // This is only a friendly display of the network
  // currently selected inside the wallet.
  // ====================================================

  private getChainText(
    chainId: number | null
  ): string {
    if (
      chainId === null
    ) {
      return "CONNECTED";
    }

    switch (chainId) {
      case 1:
        return "ETHEREUM";

      case 8453:
        return "BASE";

      case 42161:
        return "ARBITRUM";

      case 10:
        return "OPTIMISM";

      case 56:
        return "BNB CHAIN";

      case 137:
        return "POLYGON";

      default:
        return `CHAIN ${chainId}`;
    }
  }

  // ====================================================
  // ERROR
  // ====================================================

  private showError(
    message: string
  ) {
    this.container.classList.remove(
      "connected"
    );

    this.status.textContent =
      message;

    this.button.textContent =
      "CONNECT WALLET";

    // Return normal status after a few seconds.
    window.setTimeout(
      () => {
        if (
          !this.wallet.isConnected()
        ) {
          this.render(
            this.wallet.getState()
          );
        }
      },
      3000
    );
  }

  // ====================================================
  // DESTROY
  // ====================================================

  public destroy() {
    if (
      this.unsubscribe
    ) {
      this.unsubscribe();

      this.unsubscribe =
        null;
    }

    this.container.remove();
  }
}
