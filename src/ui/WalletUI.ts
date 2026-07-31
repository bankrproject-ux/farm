import WalletManager, {
  type WalletState,
} from "../wallet/WalletManager";

// ======================================================
// MINING TYCOON 3D
// LANDING / WALLET LOGIN
// ======================================================

export default class WalletUI {
  private wallet:
    WalletManager;

  private overlay:
    HTMLDivElement;

  private connectButton:
    HTMLButtonElement;

  private disconnectButton:
    HTMLButtonElement;

  private walletStatus:
    HTMLDivElement;

  private walletAddress:
    HTMLDivElement;

  private networkStatus:
    HTMLSpanElement;

  private connecting =
    false;

  private signing =
    false;

  private disconnecting =
    false;

  private authenticated =
    false;

  private authenticatedAddress:
    string | null = null;

  private unsubscribe:
    (() => void) | null =
      null;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor(
    wallet: WalletManager
  ) {
    this.wallet =
      wallet;

    // ==================================================
    // ROOT OVERLAY
    // ==================================================

    this.overlay =
      document.createElement(
        "div"
      );

    this.overlay.className =
      "landing-page";

    // ==================================================
    // BACKGROUND
    // ==================================================

    const background =
      document.createElement(
        "div"
      );

    background.className =
      "landing-background";

    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "landing-grid";

    const glowOne =
      document.createElement(
        "div"
      );

    glowOne.className =
      "landing-glow landing-glow-one";

    const glowTwo =
      document.createElement(
        "div"
      );

    glowTwo.className =
      "landing-glow landing-glow-two";

    background.appendChild(
      grid
    );

    background.appendChild(
      glowOne
    );

    background.appendChild(
      glowTwo
    );

    this.overlay.appendChild(
      background
    );

    // ==================================================
    // TOP BAR
    // ==================================================

    const topBar =
      document.createElement(
        "div"
      );

    topBar.className =
      "landing-topbar";

    topBar.innerHTML = `
      <div class="landing-brand">
        <div class="landing-brand-mark">
          MT
        </div>

        <div class="landing-brand-text">
          <strong>
            MINING TYCOON
          </strong>

          <span>
            INDUSTRIAL MINING SIMULATOR
          </span>
        </div>
      </div>

      <div class="landing-build">
        <span class="landing-build-dot"></span>

        ALPHA BUILD
      </div>
    `;

    this.overlay.appendChild(
      topBar
    );

    // ==================================================
    // MAIN CONTENT
    // ==================================================

    const content =
      document.createElement(
        "main"
      );

    content.className =
      "landing-content";

    // ==================================================
    // EYEBROW
    // ==================================================

    const eyebrow =
      document.createElement(
        "div"
      );

    eyebrow.className =
      "landing-eyebrow";

    eyebrow.innerHTML = `
      <span></span>

      FACILITY NETWORK ONLINE

      <span></span>
    `;

    content.appendChild(
      eyebrow
    );

    // ==================================================
    // TITLE
    // ==================================================

    const title =
      document.createElement(
        "h1"
      );

    title.className =
      "landing-title";

    title.innerHTML = `
      MINING
      <span>TYCOON</span>
    `;

    content.appendChild(
      title
    );

    // ==================================================
    // TAGLINE
    // ==================================================

    const tagline =
      document.createElement(
        "div"
      );

    tagline.className =
      "landing-tagline";

    tagline.innerHTML = `
      <span>BUILD</span>
      <i></i>

      <span>POWER</span>
      <i></i>

      <span>MINE</span>
      <i></i>

      <span>EXPAND</span>
    `;

    content.appendChild(
      tagline
    );

    // ==================================================
    // DESCRIPTION
    // ==================================================

    const description =
      document.createElement(
        "p"
      );

    description.className =
      "landing-description";

    description.textContent =
      "Build your mining operation from the ground up. Deploy hardware, manage power infrastructure, and grow your facility into an industrial mining empire.";

    content.appendChild(
      description
    );

    // ==================================================
    // LOGIN PANEL
    // ==================================================

    const loginPanel =
      document.createElement(
        "section"
      );

    loginPanel.className =
      "landing-login-panel";

    const panelHeader =
      document.createElement(
        "div"
      );

    panelHeader.className =
      "landing-panel-header";

    panelHeader.innerHTML = `
      <span>
        FACILITY ACCESS
      </span>

      <span class="landing-panel-security">
        SECURE
      </span>
    `;

    loginPanel.appendChild(
      panelHeader
    );

    // ==================================================
    // WALLET STATUS
    // ==================================================

    this.walletStatus =
      document.createElement(
        "div"
      );

    this.walletStatus.className =
      "landing-wallet-status";

    loginPanel.appendChild(
      this.walletStatus
    );

    // ==================================================
    // WALLET ADDRESS
    // ==================================================

    this.walletAddress =
      document.createElement(
        "div"
      );

    this.walletAddress.className =
      "landing-wallet-address";

    this.walletAddress.style.display =
      "none";

    loginPanel.appendChild(
      this.walletAddress
    );

    // ==================================================
    // MAIN BUTTON
    // ==================================================

    this.connectButton =
      document.createElement(
        "button"
      );

    this.connectButton.type =
      "button";

    this.connectButton.className =
      "landing-connect-button";

    this.connectButton.addEventListener(
      "click",
      () => {
        void this.handleMainButton();
      }
    );

    loginPanel.appendChild(
      this.connectButton
    );

    // ==================================================
    // SWITCH WALLET BUTTON
    // ==================================================

    this.disconnectButton =
      document.createElement(
        "button"
      );

    this.disconnectButton.type =
      "button";

    this.disconnectButton.className =
      "landing-disconnect-button";

    this.disconnectButton.textContent =
      "SWITCH WALLET";

    this.disconnectButton.style.display =
      "none";

    this.disconnectButton.addEventListener(
      "click",
      () => {
        void this.disconnectWallet();
      }
    );

    loginPanel.appendChild(
      this.disconnectButton
    );

    // ==================================================
    // NETWORK
    // ==================================================

    const network =
      document.createElement(
        "div"
      );

    network.className =
      "landing-network";

    network.innerHTML = `
      <div>
        <span class="landing-network-dot"></span>

        EVM COMPATIBLE
      </div>

      <div>
        NETWORK

        <span class="landing-network-value">
          AUTO DETECT
        </span>
      </div>
    `;

    this.networkStatus =
      network.querySelector(
        ".landing-network-value"
      ) as HTMLSpanElement;

    loginPanel.appendChild(
      network
    );

    content.appendChild(
      loginPanel
    );

    // ==================================================
    // DISCLAIMER
    // ==================================================

    const disclaimer =
      document.createElement(
        "div"
      );

    disclaimer.className =
      "landing-disclaimer";

    disclaimer.innerHTML = `
      <span>◆</span>

      Signing is free and does not send a transaction.
      Mining Tycoon never requests your private key.
    `;

    content.appendChild(
      disclaimer
    );

    this.overlay.appendChild(
      content
    );

    // ==================================================
    // SIDE DECORATIONS
    // ==================================================

    const leftDecoration =
      document.createElement(
        "div"
      );

    leftDecoration.className =
      "landing-side landing-side-left";

    leftDecoration.innerHTML = `
      <span>01</span>
      <div></div>
      <small>FACILITY</small>
    `;

    const rightDecoration =
      document.createElement(
        "div"
      );

    rightDecoration.className =
      "landing-side landing-side-right";

    rightDecoration.innerHTML = `
      <span>ONLINE</span>
      <div></div>
      <small>NETWORK</small>
    `;

    this.overlay.appendChild(
      leftDecoration
    );

    this.overlay.appendChild(
      rightDecoration
    );

    // ==================================================
    // FOOTER
    // ==================================================

    const footer =
      document.createElement(
        "footer"
      );

    footer.className =
      "landing-footer";

    footer.innerHTML = `
      <div>
        MINING TYCOON
        <span>
          © 2026
        </span>
      </div>

      <div class="landing-footer-center">
        <span></span>

        SYSTEM READY

        <span></span>
      </div>

      <div>
        VERSION
        <span>
          0.1 ALPHA
        </span>
      </div>
    `;

    this.overlay.appendChild(
      footer
    );

    // ==================================================
    // MOUNT
    // ==================================================

    document.body.appendChild(
      this.overlay
    );

    // ==================================================
    // WALLET SUBSCRIPTION
    // ==================================================

    this.unsubscribe =
      this.wallet.subscribe(
        (state) => {
          this.handleWalletState(
            state
          );
        }
      );
  }

  // ====================================================
  // MAIN BUTTON
  // ====================================================

  private async handleMainButton() {
    if (
      this.connecting ||
      this.signing ||
      this.disconnecting
    ) {
      return;
    }

    if (
      !this.wallet.isConnected()
    ) {
      await this.connectWallet();

      return;
    }

    if (
      !this.authenticated
    ) {
      await this.signLogin();

      return;
    }

    this.enterFacility();
  }

  // ====================================================
  // CONNECT WALLET
  // ====================================================

  private async connectWallet() {
    if (
      !this.wallet.isWalletAvailable()
    ) {
      this.showError(
        "NO EVM WALLET DETECTED"
      );

      return;
    }

    this.connecting =
      true;

    this.connectButton.disabled =
      true;

    this.disconnectButton.disabled =
      true;

    this.walletStatus.textContent =
      "WAITING FOR WALLET APPROVAL...";

    this.connectButton.innerHTML = `
      <span class="landing-wallet-icon landing-wallet-loading">
        ◇
      </span>

      <span>
        CONNECTING...
      </span>

      <span class="landing-button-arrow">
        ...
      </span>
    `;

    try {
      await this.wallet.connect();
    } catch (error) {
      console.error(
        "Wallet connection failed:",
        error
      );

      this.showError(
        error instanceof Error
          ? error.message
          : "Wallet connection failed."
      );
    } finally {
      this.connecting =
        false;

      this.connectButton.disabled =
        false;

      this.disconnectButton.disabled =
        false;

      this.render(
        this.wallet.getState()
      );
    }
  }

  // ====================================================
  // DISCONNECT / SWITCH WALLET
  // ====================================================

  private async disconnectWallet() {
    if (
      this.connecting ||
      this.signing ||
      this.disconnecting
    ) {
      return;
    }

    this.disconnecting =
      true;

    this.connectButton.disabled =
      true;

    this.disconnectButton.disabled =
      true;

    this.walletStatus.textContent =
      "DISCONNECTING WALLET...";

    this.disconnectButton.textContent =
      "DISCONNECTING...";

    try {
      await this.wallet.disconnect();

      this.authenticated =
        false;

      this.authenticatedAddress =
        null;

      this.overlay.style.display =
        "";

      this.overlay.classList.remove(
        "landing-leaving"
      );
    } catch (error) {
      console.error(
        "Wallet disconnect failed:",
        error
      );

      this.showError(
        error instanceof Error
          ? error.message
          : "Could not disconnect wallet."
      );
    } finally {
      this.disconnecting =
        false;

      this.connectButton.disabled =
        false;

      this.disconnectButton.disabled =
        false;

      this.disconnectButton.textContent =
        "SWITCH WALLET";

      this.render(
        this.wallet.getState()
      );
    }
  }

  // ====================================================
  // SIGN LOGIN
  // ====================================================

  private async signLogin() {
    const address =
      this.wallet.getAddress();

    if (!address) {
      return;
    }

    this.signing =
      true;

    this.connectButton.disabled =
      true;

    this.disconnectButton.disabled =
      true;

    this.walletStatus.textContent =
      "WAITING FOR SIGNATURE...";

    this.connectButton.innerHTML = `
      <span class="landing-wallet-icon landing-wallet-loading">
        ◇
      </span>

      <span>
        SIGNING...
      </span>

      <span class="landing-button-arrow">
        ...
      </span>
    `;

    try {
      const message = [
        "Mining Tycoon",
        "",
        "Sign this message to access your mining facility.",
        "",
        `Wallet: ${address}`,
        "",
        "This request will not trigger a blockchain transaction.",
      ].join("\n");

      const signature =
        await this.wallet.signMessage(
          message
        );

      if (!signature) {
        throw new Error(
          "Wallet did not return a signature."
        );
      }

      this.authenticated =
        true;

      this.authenticatedAddress =
        address.toLowerCase();

      this.render(
        this.wallet.getState()
      );
    } catch (error) {
      console.error(
        "Wallet signing failed:",
        error
      );

      this.showError(
        error instanceof Error
          ? error.message
          : "Signature rejected."
      );
    } finally {
      this.signing =
        false;

      this.connectButton.disabled =
        false;

      this.disconnectButton.disabled =
        false;

      this.render(
        this.wallet.getState()
      );
    }
  }

  // ====================================================
  // WALLET STATE CHANGE
  // ====================================================

  private handleWalletState(
    state: WalletState
  ) {
    if (
      this.authenticated &&
      (
        !state.address ||
        state.address.toLowerCase() !==
          this.authenticatedAddress
      )
    ) {
      this.authenticated =
        false;

      this.authenticatedAddress =
        null;
    }

    this.render(
      state
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  private render(
    state: WalletState
  ) {
    if (
      this.connecting ||
      this.signing ||
      this.disconnecting
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
      this.authenticated =
        false;

      this.authenticatedAddress =
        null;

      this.overlay.classList.remove(
        "wallet-connected"
      );

      this.walletAddress.style.display =
        "none";

      this.disconnectButton.style.display =
        "none";

      this.walletStatus.textContent =
        this.wallet.isWalletAvailable()
          ? "CONNECT YOUR EVM WALLET TO ACCESS YOUR FACILITY"
          : "NO EVM WALLET DETECTED";

      this.networkStatus.textContent =
        "AUTO DETECT";

      this.connectButton.innerHTML = `
        <span class="landing-wallet-icon">
          ◇
        </span>

        <span>
          CONNECT WALLET
        </span>

        <span class="landing-button-arrow">
          →
        </span>
      `;

      return;
    }

    // ==================================================
    // CONNECTED
    // ==================================================

    this.overlay.classList.add(
      "wallet-connected"
    );

    this.walletAddress.style.display =
      "flex";

    this.disconnectButton.style.display =
      "block";

    this.disconnectButton.textContent =
      "SWITCH WALLET";

    this.walletAddress.innerHTML = `
      <span class="landing-address-status"></span>

      <span>
        ${this.wallet.getShortAddress()}
      </span>
    `;

    this.networkStatus.textContent =
      this.getChainName(
        state.chainId
      );

    // ==================================================
    // CONNECTED BUT NOT SIGNED
    // ==================================================

    if (
      !this.authenticated
    ) {
      this.walletStatus.textContent =
        "WALLET CONNECTED — SIGN TO LOGIN";

      this.connectButton.innerHTML = `
        <span class="landing-wallet-icon">
          ◇
        </span>

        <span>
          SIGN TO LOGIN
        </span>

        <span class="landing-button-arrow">
          →
        </span>
      `;

      return;
    }

    // ==================================================
    // AUTHENTICATED
    // ==================================================

    this.walletStatus.textContent =
      "IDENTITY VERIFIED — FACILITY READY";

    this.connectButton.innerHTML = `
      <span class="landing-wallet-icon">
        ✓
      </span>

      <span>
        ENTER FACILITY
      </span>

      <span class="landing-button-arrow">
        →
      </span>
    `;
  }

  // ====================================================
  // CHAIN NAME
  // ====================================================

  private getChainName(
    chainId: number | null
  ): string {
    if (
      chainId === null
    ) {
      return "CONNECTED";
    }

    switch (chainId) {
      case 4663:
        return "ROBINHOOD";

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
    this.walletStatus.textContent =
      message.toUpperCase();

    this.overlay.classList.add(
      "wallet-error"
    );

    window.setTimeout(
      () => {
        this.overlay.classList.remove(
          "wallet-error"
        );

        this.render(
          this.wallet.getState()
        );
      },
      3000
    );
  }

  // ====================================================
  // ENTER FACILITY
  // ====================================================

  private enterFacility() {
    if (
      !this.wallet.isConnected() ||
      !this.authenticated
    ) {
      return;
    }

    this.overlay.classList.add(
      "landing-leaving"
    );

    window.setTimeout(
      () => {
        this.overlay.style.display =
          "none";
      },
      550
    );
  }

  // ====================================================
  // AUTH INFO
  // ====================================================

  public isAuthenticated():
    boolean {
    return (
      this.authenticated &&
      this.wallet.isConnected()
    );
  }

  public getUserId():
    string | null {
    if (
      !this.isAuthenticated()
    ) {
      return null;
    }

    return this.wallet
      .getAddress()
      ?.toLowerCase() ??
      null;
  }

  // ====================================================
  // IS LANDING OPEN
  // ====================================================

  public isOpen():
    boolean {
    return (
      this.overlay.style.display !==
      "none"
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

    this.overlay.remove();
  }
}
