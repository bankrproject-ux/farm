import InventorySystem from "../game/InventorySystem";

import WalletManager from "../wallet/WalletManager";

import {
  TREASURY_ADDRESS,
  getMinerEthPrice,
  getRackEthPrice,
  getPowerEthPrice,
  formatEthPrice,
  hasTreasuryAddress,
} from "../config/ChainConfig";

import {
  MINERS,
  getMinerEfficiency,
  type MinerDefinition,
} from "../mining/MinerTypes";

import {
  RACKS,
  type RackDefinition,
} from "../mining/RackTypes";

import {
  POWER_SOURCES,
  type PowerSourceDefinition,
} from "../mining/PowerTypes";

import type {
  Address,
} from "viem";

// ======================================================
// MINING TYCOON 3D
// HARDWARE MARKET
// ======================================================
//
// Hardware purchases use ETH.
//
// ETH flow:
//
// Player wallet
//      ↓
// Treasury wallet
//      ↓
// Hardware delivered to inventory
//
// TYCON is NOT used to purchase hardware.
//
// ======================================================

type ShopTab =
  | "miners"
  | "racks"
  | "power";

export default class ShopUI {
  private inventory:
    InventorySystem;

  private wallet:
    WalletManager;

  private root:
    HTMLDivElement;

  private content:
    HTMLDivElement;

  private walletElement:
    HTMLElement;

  private activeTab:
    ShopTab = "miners";

  private visible =
    false;

  private purchasing =
    false;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor(
    inventory: InventorySystem,
    wallet: WalletManager
  ) {
    this.inventory =
      inventory;

    this.wallet =
      wallet;

    // ==================================================
    // ROOT
    // ==================================================

    this.root =
      document.createElement(
        "div"
      );

    this.root.className =
      "shop-overlay hidden";

    // ==================================================
    // PANEL
    // ==================================================

    const panel =
      document.createElement(
        "div"
      );

    panel.className =
      "shop-panel";

    this.root.appendChild(
      panel
    );

    // ==================================================
    // HEADER
    // ==================================================

    const header =
      document.createElement(
        "div"
      );

    header.className =
      "shop-header";

    header.innerHTML = `
      <div>
        <div class="shop-eyebrow">
          FACILITY SUPPLY
        </div>

        <h2>
          HARDWARE MARKET
        </h2>
      </div>

      <div class="shop-header-right">
        <div class="shop-balance">
          <span>PAYMENT</span>

          <strong>
            WALLET
          </strong>
        </div>

        <button
          class="shop-close"
          type="button"
          aria-label="Close shop"
        >
          ×
        </button>
      </div>
    `;

    panel.appendChild(
      header
    );

    const walletElement =
      header.querySelector<HTMLElement>(
        ".shop-balance strong"
      );

    if (!walletElement) {
      throw new Error(
        "Shop wallet element not found."
      );
    }

    this.walletElement =
      walletElement;

    // ==================================================
    // TABS
    // ==================================================

    const tabs =
      document.createElement(
        "div"
      );

    tabs.className =
      "shop-tabs";

    tabs.innerHTML = `
      <button
        type="button"
        data-tab="miners"
        class="shop-tab active"
      >
        MINING SERVERS
      </button>

      <button
        type="button"
        data-tab="racks"
        class="shop-tab"
      >
        SERVER RACKS
      </button>

      <button
        type="button"
        data-tab="power"
        class="shop-tab"
      >
        POWER SYSTEMS
      </button>
    `;

    panel.appendChild(
      tabs
    );

    // ==================================================
    // CONTENT
    // ==================================================

    this.content =
      document.createElement(
        "div"
      );

    this.content.className =
      "shop-content";

    panel.appendChild(
      this.content
    );

    // ==================================================
    // FOOTER
    // ==================================================

    const footer =
      document.createElement(
        "div"
      );

    footer.className =
      "shop-footer";

    footer.textContent =
      "Hardware purchases are paid with ETH from your connected wallet.";

    panel.appendChild(
      footer
    );

    document.body.appendChild(
      this.root
    );

    // ==================================================
    // CLOSE
    // ==================================================

    const closeButton =
      header.querySelector<HTMLButtonElement>(
        ".shop-close"
      );

    closeButton?.addEventListener(
      "click",
      () => {
        this.close();
      }
    );

    // ==================================================
    // TAB EVENTS
    // ==================================================

    tabs.addEventListener(
      "click",
      (event) => {
        const target =
          event.target;

        if (
          !(
            target instanceof
            HTMLButtonElement
          )
        ) {
          return;
        }

        const tab =
          target.dataset.tab;

        if (
          tab !== "miners" &&
          tab !== "racks" &&
          tab !== "power"
        ) {
          return;
        }

        this.activeTab =
          tab;

        tabs
          .querySelectorAll(
            ".shop-tab"
          )
          .forEach(
            (button) => {
              button.classList.remove(
                "active"
              );
            }
          );

        target.classList.add(
          "active"
        );

        this.render();
      }
    );

    // ==================================================
    // WALLET STATE
    // ==================================================

    this.wallet.subscribe(
      () => {
        this.updateWalletDisplay();

        if (
          this.visible &&
          !this.purchasing
        ) {
          this.updateBuyButtons();
        }
      }
    );

    // ==================================================
    // INVENTORY
    // ==================================================

    this.inventory.subscribe(
      () => {
        if (
          this.visible &&
          !this.purchasing
        ) {
          this.render();
        }
      }
    );

    this.updateWalletDisplay();

    this.render();
  }

  // ====================================================
  // OPEN
  // ====================================================

  public open() {
    this.visible =
      true;

    this.root.classList.remove(
      "hidden"
    );

    this.updateWalletDisplay();

    this.render();

    if (
      document.pointerLockElement
    ) {
      document.exitPointerLock();
    }
  }

  // ====================================================
  // CLOSE
  // ====================================================

  public close() {
    if (
      this.purchasing
    ) {
      return;
    }

    this.visible =
      false;

    this.root.classList.add(
      "hidden"
    );
  }

  // ====================================================
  // TOGGLE
  // ====================================================

  public toggle() {
    if (
      this.visible
    ) {
      this.close();
    } else {
      this.open();
    }
  }

  // ====================================================
  // STATE
  // ====================================================

  public isOpen():
    boolean {
    return this.visible;
  }

  // ====================================================
  // WALLET DISPLAY
  // ====================================================

  private updateWalletDisplay() {
    if (
      !this.wallet.isConnected()
    ) {
      this.walletElement.textContent =
        "NOT CONNECTED";

      return;
    }

    this.walletElement.textContent =
      this.wallet.getShortAddress();
  }

  // ====================================================
  // UPDATE BUY BUTTONS
  // ====================================================

  private updateBuyButtons() {
    const buttons =
      this.content
        .querySelectorAll<HTMLButtonElement>(
          ".shop-buy"
        );

    buttons.forEach(
      (button) => {
        if (
          this.purchasing
        ) {
          button.disabled =
            true;

          if (
            button.dataset.processing ===
            "true"
          ) {
            button.textContent =
              "CONFIRM IN WALLET...";
          } else {
            button.textContent =
              "WAIT...";
          }

          return;
        }

        if (
          !this.wallet.isConnected()
        ) {
          button.disabled =
            true;

          button.textContent =
            "WALLET REQUIRED";

          return;
        }

        if (
          !hasTreasuryAddress()
        ) {
          button.disabled =
            true;

          button.textContent =
            "PAYMENT UNAVAILABLE";

          return;
        }

        button.disabled =
          false;

        button.textContent =
          "BUY";
      }
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  private render() {
    this.content.innerHTML =
      "";

    if (
      this.activeTab ===
      "miners"
    ) {
      this.renderMiners();

      this.updateBuyButtons();

      return;
    }

    if (
      this.activeTab ===
      "racks"
    ) {
      this.renderRacks();

      this.updateBuyButtons();

      return;
    }

    this.renderPowerSources();

    this.updateBuyButtons();
  }

  // ====================================================
  // MINERS
  // ====================================================

  private renderMiners() {
    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "shop-grid";

    MINERS.forEach(
      (
        miner,
        index
      ) => {
        grid.appendChild(
          this.createMinerCard(
            miner,
            index
          )
        );
      }
    );

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // MINER CARD
  // ====================================================

  private createMinerCard(
    miner: MinerDefinition,
    index: number
  ): HTMLDivElement {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "shop-card";

    const efficiency =
      getMinerEfficiency(
        miner
      );

    const owned =
      this.inventory.countMiner(
        miner.id
      );

    const price =
      getMinerEthPrice(
        index
      );

    card.innerHTML = `
      <div class="shop-card-top">
        <div>
          <span class="shop-tier">
            ${miner.tier}
          </span>

          <h3>
            ${miner.name}
          </h3>

          <small>
            ${miner.manufacturer}
          </small>
        </div>

        ${
          owned > 0
            ? `
              <div class="shop-owned">
                INVENTORY ${owned}
              </div>
            `
            : ""
        }
      </div>

      <p class="shop-description">
        ${miner.description}
      </p>

      <div class="hardware-stats">
        <div>
          <span>HASHRATE</span>

          <strong>
            ${this.formatHashrate(
              miner.hashRate
            )}
          </strong>
        </div>

        <div>
          <span>POWER</span>

          <strong>
            ${this.formatPower(
              miner.powerUsage
            )}
          </strong>
        </div>

        <div>
          <span>HEAT</span>

          <strong>
            ${miner.heatOutput}
          </strong>
        </div>

        <div>
          <span>RACK SPACE</span>

          <strong>
            ${miner.rackSlots}U
          </strong>
        </div>

        <div>
          <span>EFFICIENCY</span>

          <strong>
            ${efficiency.toFixed(
              3
            )}
          </strong>
        </div>
      </div>

      <div class="shop-card-bottom">
        <div class="shop-price">
          <span>PRICE</span>

          <strong>
            ${formatEthPrice(
              price
            )}
          </strong>
        </div>

        <button
          type="button"
          class="shop-buy"
        >
          BUY
        </button>
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".shop-buy"
      );

    button?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        void this.buyMiner(
          miner,
          price,
          button
        );
      }
    );

    return card;
  }

  // ====================================================
  // BUY MINER
  // ====================================================

  private async buyMiner(
    miner: MinerDefinition,
    price: number,
    button: HTMLButtonElement
  ) {
    const success =
      await this.processPayment(
        price,
        button
      );

    if (!success) {
      return;
    }

    this.inventory.addMiner(
      miner
    );

    this.render();
  }

  // ====================================================
  // RACKS
  // ====================================================

  private renderRacks() {
    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "shop-grid";

    RACKS.forEach(
      (
        rack,
        index
      ) => {
        grid.appendChild(
          this.createRackCard(
            rack,
            index
          )
        );
      }
    );

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // RACK CARD
  // ====================================================

  private createRackCard(
    rack: RackDefinition,
    index: number
  ): HTMLDivElement {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "shop-card";

    const owned =
      this.inventory.countRack(
        rack.id
      );

    const price =
      getRackEthPrice(
        index
      );

    card.innerHTML = `
      <div class="shop-card-top">
        <div>
          <span class="shop-tier">
            ${rack.tier}
          </span>

          <h3>
            ${rack.name}
          </h3>

          <small>
            ${rack.manufacturer}
          </small>
        </div>

        ${
          owned > 0
            ? `
              <div class="shop-owned">
                INVENTORY ${owned}
              </div>
            `
            : ""
        }
      </div>

      <p class="shop-description">
        ${rack.description}
      </p>

      <div class="hardware-stats">
        <div>
          <span>CAPACITY</span>

          <strong>
            ${rack.totalSlots}U
          </strong>
        </div>

        <div>
          <span>MAX POWER</span>

          <strong>
            ${this.formatPower(
              rack.maxPower
            )}
          </strong>
        </div>

        <div>
          <span>HEIGHT</span>

          <strong>
            ${rack.height.toFixed(
              1
            )}m
          </strong>
        </div>

        <div>
          <span>WIDTH</span>

          <strong>
            ${rack.width.toFixed(
              1
            )}m
          </strong>
        </div>
      </div>

      <div class="shop-card-bottom">
        <div class="shop-price">
          <span>PRICE</span>

          <strong>
            ${formatEthPrice(
              price
            )}
          </strong>
        </div>

        <button
          type="button"
          class="shop-buy"
        >
          BUY
        </button>
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".shop-buy"
      );

    button?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        void this.buyRack(
          rack,
          price,
          button
        );
      }
    );

    return card;
  }

  // ====================================================
  // BUY RACK
  // ====================================================

  private async buyRack(
    rack: RackDefinition,
    price: number,
    button: HTMLButtonElement
  ) {
    const success =
      await this.processPayment(
        price,
        button
      );

    if (!success) {
      return;
    }

    this.inventory.addRack(
      rack
    );

    this.render();
  }

  // ====================================================
  // POWER SOURCES
  // ====================================================

  private renderPowerSources() {
    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "shop-grid";

    POWER_SOURCES.forEach(
      (
        source,
        index
      ) => {
        grid.appendChild(
          this.createPowerSourceCard(
            source,
            index
          )
        );
      }
    );

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // POWER CARD
  // ====================================================

  private createPowerSourceCard(
    source:
      PowerSourceDefinition,
    index: number
  ): HTMLDivElement {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "shop-card";

    const owned =
      this.inventory
        .countPowerSource(
          source.id
        );

    const price =
      getPowerEthPrice(
        index
      );

    card.innerHTML = `
      <div class="shop-card-top">
        <div>
          <span class="shop-tier">
            ${source.tier}
          </span>

          <h3>
            ${source.name}
          </h3>

          <small>
            ${source.manufacturer}
          </small>
        </div>

        ${
          owned > 0
            ? `
              <div class="shop-owned">
                INVENTORY ${owned}
              </div>
            `
            : ""
        }
      </div>

      <p class="shop-description">
        ${source.description}
      </p>

      <div class="hardware-stats">
        <div>
          <span>OUTPUT</span>

          <strong>
            ${this.formatPower(
              source.capacity
            )}
          </strong>
        </div>

        <div>
          <span>TIER</span>

          <strong>
            ${source.tier.toUpperCase()}
          </strong>
        </div>

        <div>
          <span>HEIGHT</span>

          <strong>
            ${source.height.toFixed(
              1
            )}m
          </strong>
        </div>

        <div>
          <span>WIDTH</span>

          <strong>
            ${source.width.toFixed(
              1
            )}m
          </strong>
        </div>
      </div>

      <div class="shop-card-bottom">
        <div class="shop-price">
          <span>PRICE</span>

          <strong>
            ${formatEthPrice(
              price
            )}
          </strong>
        </div>

        <button
          type="button"
          class="shop-buy"
        >
          BUY
        </button>
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".shop-buy"
      );

    button?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        void this.buyPowerSource(
          source,
          price,
          button
        );
      }
    );

    return card;
  }

  // ====================================================
  // BUY POWER SOURCE
  // ====================================================

  private async buyPowerSource(
    source:
      PowerSourceDefinition,
    price: number,
    button: HTMLButtonElement
  ) {
    const success =
      await this.processPayment(
        price,
        button
      );

    if (!success) {
      return;
    }

    this.inventory.addPowerSource(
      source
    );

    this.render();
  }

  // ====================================================
  // PROCESS ETH PAYMENT
  // ====================================================

  private async processPayment(
    price: number,
    button: HTMLButtonElement
  ): Promise<boolean> {
    if (
      this.purchasing
    ) {
      return false;
    }

    // ==================================================
    // WALLET CHECK
    // ==================================================

    if (
      !this.wallet.isConnected()
    ) {
      window.alert(
        "Connect your wallet before purchasing hardware."
      );

      return false;
    }

    // ==================================================
    // TREASURY CHECK
    // ==================================================

    if (
      !hasTreasuryAddress()
    ) {
      console.error(
        "VITE_TREASURY_ADDRESS is missing or invalid."
      );

      window.alert(
        "Hardware payments are currently unavailable."
      );

      return false;
    }

    // ==================================================
    // PRICE CHECK
    // ==================================================

    if (
      !Number.isFinite(
        price
      ) ||
      price <= 0
    ) {
      console.error(
        "Invalid hardware price:",
        price
      );

      return false;
    }

    this.purchasing =
      true;

    button.dataset.processing =
      "true";

    this.updateBuyButtons();

    try {
      // ------------------------------------------------
      // IMPORTANT:
      //
      // Number is converted to a decimal ETH string.
      //
      // ChainConfig prices are intentionally simple
      // decimal values such as:
      //
      // 0.0005
      // 0.001
      // 0.002
      // ------------------------------------------------

      const amountEth =
        this.toEthAmountString(
          price
        );

      // ------------------------------------------------
      // REQUEST PAYMENT
      // ------------------------------------------------

      const txHash =
        await this.wallet.sendEth(
          TREASURY_ADDRESS as Address,
          amountEth
        );

      console.log(
        "Hardware purchase transaction submitted:",
        txHash
      );

      // ------------------------------------------------
      // DEVELOPMENT PURCHASE FLOW
      //
      // For now:
      //
      // wallet/provider returns a tx hash
      //      ↓
      // purchase is treated as submitted
      //      ↓
      // hardware is added by caller
      //
      // BEFORE production / withdrawable TYCON:
      //
      // backend MUST verify transaction receipt first.
      // ------------------------------------------------

      return true;
    } catch (error) {
      console.error(
        "Hardware payment failed:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Transaction failed.";

      window.alert(
        `Purchase failed:\n${message}`
      );

      return false;
    } finally {
      this.purchasing =
        false;

      delete button.dataset.processing;

      this.updateBuyButtons();
    }
  }

  // ====================================================
  // ETH AMOUNT STRING
  // ====================================================

  private toEthAmountString(
    value: number
  ): string {
    return value
      .toFixed(18)
      .replace(
        /0+$/,
        ""
      )
      .replace(
        /\.$/,
        ""
      );
  }

  // ====================================================
  // FORMAT POWER
  // ====================================================

  private formatPower(
    watts: number
  ): string {
    if (
      watts >= 1000
    ) {
      return `${(
        watts / 1000
      ).toFixed(
        1
      )} kW`;
    }

    return `${watts} W`;
  }

  // ====================================================
  // FORMAT HASHRATE
  // ====================================================

  private formatHashrate(
    hashRate: number
  ): string {
    if (
      hashRate >= 1000
    ) {
      return `${(
        hashRate / 1000
      ).toFixed(
        2
      )} GH/s`;
    }

    return `${hashRate} MH/s`;
  }
}
