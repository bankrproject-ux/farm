import GameState from "../game/GameState";
import InventorySystem from "../game/InventorySystem";

import {
  MINERS,
  getMinerEfficiency,
  type MinerDefinition,
} from "../mining/MinerTypes";

import {
  RACKS,
  type RackDefinition,
} from "../mining/RackTypes";

// ======================================================
// MINING TYCOON 3D
// Shop UI
// ======================================================

type ShopTab =
  | "miners"
  | "racks";

export default class ShopUI {
  private gameState: GameState;

  private inventory: InventorySystem;

  private root:
    HTMLDivElement;

  private content:
    HTMLDivElement;

  private balanceElement:
    HTMLSpanElement;

  private activeTab:
    ShopTab = "miners";

  private visible = false;

  constructor(
    gameState: GameState,
    inventory: InventorySystem
  ) {
    this.gameState =
      gameState;

    this.inventory =
      inventory;

    // ==================================================
    // ROOT
    // ==================================================

    this.root =
      document.createElement(
        "div"
      );

    this.root.className =
      "shop-overlay";

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
          <span>BALANCE</span>

          <strong>
            $0
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

    const balanceElement =
      header.querySelector<HTMLSpanElement>(
        ".shop-balance strong"
      );

    if (!balanceElement) {
      throw new Error(
        "Shop balance element not found."
      );
    }

    this.balanceElement =
      balanceElement;

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

    footer.innerHTML = `
      Purchased hardware is delivered
      to your facility inventory.
    `;

    panel.appendChild(
      footer
    );

    document.body.appendChild(
      this.root
    );

    // ==================================================
    // EVENTS
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
          tab !== "racks"
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

    // Escape closes shop.

    window.addEventListener(
      "keydown",
      (event) => {
        if (
          event.code ===
            "Escape" &&
          this.visible
        ) {
          this.close();
        }
      }
    );

    // Keep balance updated.

    this.gameState.subscribe(
      () => {
        this.updateBalance();

        if (this.visible) {
          this.render();
        }
      }
    );

    this.updateBalance();

    this.render();

    this.root.classList.add(
      "hidden"
    );
  }

  // ====================================================
  // OPEN
  // ====================================================

  public open() {
    this.visible = true;

    this.root.classList.remove(
      "hidden"
    );

    this.updateBalance();

    this.render();

    // Release FPS mouse control.
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
    this.visible = false;

    this.root.classList.add(
      "hidden"
    );
  }

  // ====================================================
  // TOGGLE
  // ====================================================

  public toggle() {
    if (this.visible) {
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
  // BALANCE
  // ====================================================

  private updateBalance() {
    this.balanceElement.textContent =
      this.formatMoney(
        this.gameState.getBalance()
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
      return;
    }

    this.renderRacks();
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

    for (
      const miner
      of MINERS
    ) {
      grid.appendChild(
        this.createMinerCard(
          miner
        )
      );
    }

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // MINER CARD
  // ====================================================

  private createMinerCard(
    miner: MinerDefinition
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

    const canAfford =
      this.gameState.canAfford(
        miner.price
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
            ${this.formatMoney(
              miner.price
            )}
          </strong>
        </div>

        <button
          type="button"
          class="shop-buy"
          ${
            canAfford
              ? ""
              : "disabled"
          }
        >
          ${
            canAfford
              ? "BUY"
              : "INSUFFICIENT FUNDS"
          }
        </button>
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".shop-buy"
      );

    button?.addEventListener(
      "click",
      () => {
        this.buyMiner(
          miner
        );
      }
    );

    return card;
  }

  // ====================================================
  // BUY MINER
  // ====================================================

  private buyMiner(
    miner: MinerDefinition
  ) {
    const purchased =
      this.gameState.spend(
        miner.price
      );

    if (!purchased) {
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

    for (
      const rack
      of RACKS
    ) {
      grid.appendChild(
        this.createRackCard(
          rack
        )
      );
    }

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // RACK CARD
  // ====================================================

  private createRackCard(
    rack: RackDefinition
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

    const canAfford =
      this.gameState.canAfford(
        rack.price
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
            ${this.formatMoney(
              rack.price
            )}
          </strong>
        </div>

        <button
          type="button"
          class="shop-buy"
          ${
            canAfford
              ? ""
              : "disabled"
          }
        >
          ${
            canAfford
              ? "BUY"
              : "INSUFFICIENT FUNDS"
          }
        </button>
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".shop-buy"
      );

    button?.addEventListener(
      "click",
      () => {
        this.buyRack(
          rack
        );
      }
    );

    return card;
  }

  // ====================================================
  // BUY RACK
  // ====================================================

  private buyRack(
    rack: RackDefinition
  ) {
    const purchased =
      this.gameState.spend(
        rack.price
      );

    if (!purchased) {
      return;
    }

    this.inventory.addRack(
      rack
    );

    this.render();
  }

  // ====================================================
  // FORMATTERS
  // ====================================================

  private formatMoney(
    value: number
  ): string {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }
    ).format(value);
  }

  private formatPower(
    watts: number
  ): string {
    if (watts >= 1000) {
      return `${(
        watts / 1000
      ).toFixed(1)} kW`;
    }

    return `${watts} W`;
  }

  private formatHashrate(
    hashRate: number
  ): string {
    if (hashRate >= 1000) {
      return `${(
        hashRate / 1000
      ).toFixed(2)} GH/s`;
    }

    return `${hashRate} MH/s`;
  }
}
