import InventorySystem, {
  type InventoryItem,
  type InventoryMinerItem,
  type InventoryRackItem,
  type InventoryPowerSourceItem,
} from "../game/InventorySystem";

// ======================================================
// MINING TYCOON 3D
// Inventory UI
//
// Supports:
// - Server racks
// - Mining servers
// - Power hardware
// ======================================================

type InventoryTab =
  | "all"
  | "racks"
  | "miners"
  | "power";

export default class InventoryUI {
  private inventory:
    InventorySystem;

  private root:
    HTMLDivElement;

  private content:
    HTMLDivElement;

  private countElement:
    HTMLElement;

  private activeTab:
    InventoryTab = "all";

  private visible =
    false;

  // ====================================================
  // CALLBACKS
  // ====================================================

  // Rack placement already exists.
  private onPlaceRack:
    (
      item:
        InventoryRackItem
    ) => void;

  // Power placement will be connected
  // later. Keeping this optional means
  // current main.ts does NOT need changing yet.
  private onPlacePowerSource?:
    (
      item:
        InventoryPowerSourceItem
    ) => void;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor(
    inventory:
      InventorySystem,

    onPlaceRack:
      (
        item:
          InventoryRackItem
      ) => void,

    onPlacePowerSource?:
      (
        item:
          InventoryPowerSourceItem
      ) => void
  ) {
    this.inventory =
      inventory;

    this.onPlaceRack =
      onPlaceRack;

    this.onPlacePowerSource =
      onPlacePowerSource;

    // ==================================================
    // ROOT
    // ==================================================

    this.root =
      document.createElement(
        "div"
      );

    this.root.className =
      "inventory-overlay hidden";

    // ==================================================
    // PANEL
    // ==================================================

    const panel =
      document.createElement(
        "div"
      );

    panel.className =
      "inventory-panel";

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
      "inventory-header";

    header.innerHTML = `
      <div>
        <div class="inventory-eyebrow">
          FACILITY STORAGE
        </div>

        <h2>
          INVENTORY
        </h2>
      </div>

      <div class="inventory-header-right">
        <div class="inventory-count">
          <span>ITEMS</span>

          <strong>
            0
          </strong>
        </div>

        <button
          type="button"
          class="inventory-close"
          aria-label="Close inventory"
        >
          ×
        </button>
      </div>
    `;

    panel.appendChild(
      header
    );

    const countElement =
      header.querySelector<HTMLElement>(
        ".inventory-count strong"
      );

    if (!countElement) {
      throw new Error(
        "Inventory count element not found."
      );
    }

    this.countElement =
      countElement;

    // ==================================================
    // TABS
    // ==================================================

    const tabs =
      document.createElement(
        "div"
      );

    tabs.className =
      "inventory-tabs";

    tabs.innerHTML = `
      <button
        type="button"
        class="inventory-tab active"
        data-tab="all"
      >
        ALL
      </button>

      <button
        type="button"
        class="inventory-tab"
        data-tab="racks"
      >
        RACKS
      </button>

      <button
        type="button"
        class="inventory-tab"
        data-tab="miners"
      >
        MINING SERVERS
      </button>

      <button
        type="button"
        class="inventory-tab"
        data-tab="power"
      >
        POWER
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
      "inventory-content";

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
      "inventory-footer";

    footer.innerHTML = `
      Build your facility by placing racks
      and electrical hardware before
      installing mining servers.
    `;

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
        ".inventory-close"
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
          tab !== "all" &&
          tab !== "racks" &&
          tab !== "miners" &&
          tab !== "power"
        ) {
          return;
        }

        this.activeTab =
          tab;

        tabs
          .querySelectorAll(
            ".inventory-tab"
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
    // INVENTORY EVENTS
    // ==================================================

    this.inventory.subscribe(
      () => {
        this.updateCount();

        if (
          this.visible
        ) {
          this.render();
        }
      }
    );

    this.updateCount();

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

    if (
      document.pointerLockElement
    ) {
      document.exitPointerLock();
    }

    this.updateCount();

    this.render();
  }

  // ====================================================
  // CLOSE
  // ====================================================

  public close() {
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
  // COUNT
  // ====================================================

  private updateCount() {
    this.countElement.textContent =
      this.inventory
        .getItemCount()
        .toString();
  }

  // ====================================================
  // RENDER
  // ====================================================

  private render() {
    this.content.innerHTML =
      "";

    const items =
      this.getFilteredItems();

    if (
      items.length === 0
    ) {
      this.renderEmpty();

      return;
    }

    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "inventory-grid";

    for (
      const item
      of items
    ) {
      grid.appendChild(
        this.createItemCard(
          item
        )
      );
    }

    this.content.appendChild(
      grid
    );
  }

  // ====================================================
  // FILTER
  // ====================================================

  private getFilteredItems():
    readonly InventoryItem[] {
    const items =
      this.inventory.getItems();

    if (
      this.activeTab ===
      "all"
    ) {
      return items;
    }

    if (
      this.activeTab ===
      "racks"
    ) {
      return items.filter(
        (
          item
        ): item is
          InventoryRackItem =>
          item.type ===
          "rack"
      );
    }

    if (
      this.activeTab ===
      "miners"
    ) {
      return items.filter(
        (
          item
        ): item is
          InventoryMinerItem =>
          item.type ===
          "miner"
      );
    }

    return items.filter(
      (
        item
      ): item is
        InventoryPowerSourceItem =>
        item.type ===
        "power_source"
    );
  }

  // ====================================================
  // EMPTY
  // ====================================================

  private renderEmpty() {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "inventory-empty";

    let message =
      "Your facility inventory is empty.";

    if (
      this.activeTab ===
      "racks"
    ) {
      message =
        "No server racks in storage.";
    }

    if (
      this.activeTab ===
      "miners"
    ) {
      message =
        "No mining servers in storage.";
    }

    if (
      this.activeTab ===
      "power"
    ) {
      message =
        "No electrical hardware in storage.";
    }

    empty.innerHTML = `
      <div class="inventory-empty-icon">
        ◇
      </div>

      <strong>
        STORAGE EMPTY
      </strong>

      <p>
        ${message}
      </p>

      <span>
        Purchase hardware from
        the Hardware Market.
      </span>
    `;

    this.content.appendChild(
      empty
    );
  }

  // ====================================================
  // ITEM CARD
  // ====================================================

  private createItemCard(
    item: InventoryItem
  ): HTMLDivElement {
    if (
      item.type ===
      "rack"
    ) {
      return this.createRackCard(
        item
      );
    }

    if (
      item.type ===
      "miner"
    ) {
      return this.createMinerCard(
        item
      );
    }

    return this.createPowerCard(
      item
    );
  }

  // ====================================================
  // RACK CARD
  // ====================================================

  private createRackCard(
    item:
      InventoryRackItem
  ): HTMLDivElement {
    const rack =
      item.definition;

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "inventory-card";

    card.innerHTML = `
      <div class="inventory-item-visual rack-visual">
        <div class="rack-visual-frame">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      <div class="inventory-item-type">
        SERVER RACK
      </div>

      <h3>
        ${rack.name}
      </h3>

      <span class="inventory-manufacturer">
        ${rack.manufacturer}
      </span>

      <div class="inventory-item-stats">
        <div>
          <span>
            CAPACITY
          </span>

          <strong>
            ${rack.totalSlots}U
          </strong>
        </div>

        <div>
          <span>
            MAX POWER
          </span>

          <strong>
            ${this.formatPower(
              rack.maxPower
            )}
          </strong>
        </div>
      </div>

      <button
        type="button"
        class="inventory-action"
      >
        PLACE RACK
      </button>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".inventory-action"
      );

    button?.addEventListener(
      "click",
      () => {
        this.close();

        this.onPlaceRack(
          item
        );
      }
    );

    return card;
  }

  // ====================================================
  // MINER CARD
  // ====================================================

  private createMinerCard(
    item:
      InventoryMinerItem
  ): HTMLDivElement {
    const miner =
      item.definition;

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "inventory-card";

    card.innerHTML = `
      <div class="inventory-item-visual miner-visual">
        <div class="miner-face">
          <div class="miner-vents">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div class="miner-led"></div>
        </div>
      </div>

      <div class="inventory-item-type">
        MINING SERVER
      </div>

      <h3>
        ${miner.name}
      </h3>

      <span class="inventory-manufacturer">
        ${miner.manufacturer}
      </span>

      <div class="inventory-item-stats">
        <div>
          <span>
            HASHRATE
          </span>

          <strong>
            ${this.formatHashrate(
              miner.hashRate
            )}
          </strong>
        </div>

        <div>
          <span>
            POWER
          </span>

          <strong>
            ${this.formatPower(
              miner.powerUsage
            )}
          </strong>
        </div>

        <div>
          <span>
            RACK SPACE
          </span>

          <strong>
            ${miner.rackSlots}U
          </strong>
        </div>

        <div>
          <span>
            HEAT
          </span>

          <strong>
            ${miner.heatOutput}
          </strong>
        </div>
      </div>

      <button
        type="button"
        class="inventory-action secondary"
        disabled
      >
        INSTALL INTO RACK
      </button>

      <div class="inventory-hint">
        Interact with a placed rack
        to install this server.
      </div>
    `;

    return card;
  }

  // ====================================================
  // POWER SOURCE CARD
  // ====================================================

  private createPowerCard(
    item:
      InventoryPowerSourceItem
  ): HTMLDivElement {
    const power =
      item.definition;

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "inventory-card";

    card.innerHTML = `
      <div class="inventory-item-visual power-visual">
        <div
          style="
            width: 72px;
            height: 92px;
            border: 2px solid #33485f;
            background: #0b1118;
            position: relative;
            box-shadow:
              inset 0 0 20px rgba(50, 140, 255, 0.08);
          "
        >
          <div
            style="
              position: absolute;
              left: 12px;
              right: 12px;
              top: 16px;
              height: 4px;
              background: #26384a;
            "
          ></div>

          <div
            style="
              position: absolute;
              left: 12px;
              right: 12px;
              top: 29px;
              height: 4px;
              background: #26384a;
            "
          ></div>

          <div
            style="
              position: absolute;
              left: 12px;
              right: 12px;
              top: 42px;
              height: 4px;
              background: #26384a;
            "
          ></div>

          <div
            style="
              position: absolute;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #52ff91;
              right: 10px;
              bottom: 10px;
              box-shadow:
                0 0 8px #52ff91;
            "
          ></div>
        </div>
      </div>

      <div class="inventory-item-type">
        POWER DISTRIBUTION
      </div>

      <h3>
        ${power.name}
      </h3>

      <span class="inventory-manufacturer">
        ${power.manufacturer}
      </span>

      <div class="inventory-item-stats">
        <div>
          <span>
            CAPACITY
          </span>

          <strong>
            ${this.formatPower(
              power.capacity
            )}
          </strong>
        </div>

        <div>
          <span>
            TIER
          </span>

          <strong>
            ${power.tier.toUpperCase()}
          </strong>
        </div>
      </div>

      <button
        type="button"
        class="inventory-action power-place-action"
        ${
          this.onPlacePowerSource
            ? ""
            : "disabled"
        }
      >
        ${
          this.onPlacePowerSource
            ? "PLACE POWER UNIT"
            : "PLACEMENT NOT READY"
        }
      </button>

      <div class="inventory-hint">
        Supplies electricity to
        mining hardware in the facility.
      </div>
    `;

    const button =
      card.querySelector<HTMLButtonElement>(
        ".power-place-action"
      );

    if (
      button &&
      this.onPlacePowerSource
    ) {
      button.addEventListener(
        "click",
        () => {
          this.close();

          this.onPlacePowerSource?.(
            item
          );
        }
      );
    }

    return card;
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
      ).toFixed(1)} kW`;
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
      ).toFixed(2)} GH/s`;
    }

    return `${hashRate} MH/s`;
  }
}
