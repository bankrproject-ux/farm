import type {
  RackInstance,
} from "../mining/RackTypes";

import type {
  MinerDefinition,
} from "../mining/MinerTypes";

import InventorySystem, {
  type InventoryMinerItem,
} from "../game/InventorySystem";

// ======================================================
// MINING TYCOON 3D
// Rack Management UI
// ======================================================

export type MinerInstalledCallback = (
  rack: RackInstance,
  miner: MinerDefinition,
  inventoryItem: InventoryMinerItem
) => void;

export default class RackManagementUI {
  private inventory:
    InventorySystem;

  private root:
    HTMLDivElement;

  private content:
    HTMLDivElement;

  private currentRack:
    RackInstance | null = null;

  private visible =
    false;

  private onMinerInstalled:
    MinerInstalledCallback;

  constructor(
    inventory: InventorySystem,
    onMinerInstalled:
      MinerInstalledCallback
  ) {
    this.inventory =
      inventory;

    this.onMinerInstalled =
      onMinerInstalled;

    // ==================================================
    // ROOT
    // ==================================================

    this.root =
      document.createElement(
        "div"
      );

    this.root.className =
      "rack-management-overlay hidden";

    // ==================================================
    // PANEL
    // ==================================================

    const panel =
      document.createElement(
        "div"
      );

    panel.className =
      "rack-management-panel";

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
      "rack-management-header";

    header.innerHTML = `
      <div>
        <div class="rack-management-eyebrow">
          FACILITY HARDWARE
        </div>

        <h2>
          RACK MANAGEMENT
        </h2>
      </div>

      <button
        type="button"
        class="rack-management-close"
        aria-label="Close rack management"
      >
        ×
      </button>
    `;

    panel.appendChild(
      header
    );

    // ==================================================
    // CONTENT
    // ==================================================

    this.content =
      document.createElement(
        "div"
      );

    this.content.className =
      "rack-management-content";

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
      "rack-management-footer";

    footer.textContent =
      "Install mining servers into available rack space.";

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
        ".rack-management-close"
      );

    closeButton?.addEventListener(
      "click",
      () => {
        this.close();
      }
    );

    // ==================================================
    // INVENTORY CHANGES
    // ==================================================

    this.inventory.subscribe(
      () => {
        if (
          this.visible &&
          this.currentRack
        ) {
          this.render();
        }
      }
    );
  }

  // ====================================================
  // OPEN
  // ====================================================

  public open(
    rack: RackInstance
  ) {
    this.currentRack =
      rack;

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

    this.currentRack =
      null;
  }

  // ====================================================
  // STATE
  // ====================================================

  public isOpen():
    boolean {
    return this.visible;
  }

  // ====================================================
  // RENDER
  // ====================================================

  private render() {
    if (!this.currentRack) {
      return;
    }

    const rack =
      this.currentRack;

    const usedSlots =
      this.getUsedSlots(
        rack
      );

    const usedPower =
      this.getUsedPower(
        rack
      );

    const totalHashrate =
      this.getTotalHashrate(
        rack
      );

    const availableSlots =
      Math.max(
        0,
        rack.definition.totalSlots -
          usedSlots
      );

    const availablePower =
      Math.max(
        0,
        rack.definition.maxPower -
          usedPower
      );

    this.content.innerHTML =
      "";

    // ==================================================
    // RACK SUMMARY
    // ==================================================

    const summary =
      document.createElement(
        "div"
      );

    summary.className =
      "rack-summary";

    summary.innerHTML = `
      <div class="rack-summary-title">
        <div>
          <span>
            SERVER RACK
          </span>

          <h3>
            ${rack.definition.name}
          </h3>

          <small>
            ${rack.definition.manufacturer}
          </small>
        </div>

        <div class="rack-status">
          ONLINE
        </div>
      </div>

      <div class="rack-summary-stats">
        <div>
          <span>
            RACK SPACE
          </span>

          <strong>
            ${usedSlots}U /
            ${rack.definition.totalSlots}U
          </strong>

          <small>
            ${availableSlots}U AVAILABLE
          </small>
        </div>

        <div>
          <span>
            POWER LOAD
          </span>

          <strong>
            ${this.formatPower(
              usedPower
            )}
            /
            ${this.formatPower(
              rack.definition.maxPower
            )}
          </strong>

          <small>
            ${this.formatPower(
              availablePower
            )}
            AVAILABLE
          </small>
        </div>

        <div>
          <span>
            HASHRATE
          </span>

          <strong>
            ${this.formatHashrate(
              totalHashrate
            )}
          </strong>

          <small>
            CURRENT OUTPUT
          </small>
        </div>

        <div>
          <span>
            SERVERS
          </span>

          <strong>
            ${rack.miners.length}
          </strong>

          <small>
            INSTALLED
          </small>
        </div>
      </div>
    `;

    this.content.appendChild(
      summary
    );

    // ==================================================
    // MAIN GRID
    // ==================================================

    const layout =
      document.createElement(
        "div"
      );

    layout.className =
      "rack-management-layout";

    // ==================================================
    // LEFT — INSTALLED HARDWARE
    // ==================================================

    const installedSection =
      document.createElement(
        "section"
      );

    installedSection.className =
      "rack-management-section";

    installedSection.innerHTML = `
      <div class="rack-section-heading">
        <div>
          <span>
            RACK HARDWARE
          </span>

          <h3>
            INSTALLED SERVERS
          </h3>
        </div>

        <strong>
          ${rack.miners.length}
        </strong>
      </div>
    `;

    if (
      rack.miners.length === 0
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "rack-empty";

      empty.innerHTML = `
        <div class="rack-empty-icon">
          ▤
        </div>

        <strong>
          RACK EMPTY
        </strong>

        <p>
          No mining servers
          installed.
        </p>
      `;

      installedSection.appendChild(
        empty
      );
    } else {
      const installedList =
        document.createElement(
          "div"
        );

      installedList.className =
        "installed-miner-list";

      rack.miners.forEach(
        (
          miner,
          index
        ) => {
          installedList.appendChild(
            this.createInstalledMiner(
              miner,
              index
            )
          );
        }
      );

      installedSection.appendChild(
        installedList
      );
    }

    layout.appendChild(
      installedSection
    );

    // ==================================================
    // RIGHT — INVENTORY
    // ==================================================

    const inventorySection =
      document.createElement(
        "section"
      );

    inventorySection.className =
      "rack-management-section";

    const availableMiners =
      this.getInventoryMiners();

    inventorySection.innerHTML = `
      <div class="rack-section-heading">
        <div>
          <span>
            FACILITY STORAGE
          </span>

          <h3>
            AVAILABLE SERVERS
          </h3>
        </div>

        <strong>
          ${availableMiners.length}
        </strong>
      </div>
    `;

    if (
      availableMiners.length ===
      0
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "rack-empty";

      empty.innerHTML = `
        <div class="rack-empty-icon">
          ◇
        </div>

        <strong>
          NO SERVERS
        </strong>

        <p>
          Buy mining servers
          from the Hardware Market.
        </p>
      `;

      inventorySection.appendChild(
        empty
      );
    } else {
      const list =
        document.createElement(
          "div"
        );

      list.className =
        "available-miner-list";

      for (
        const item
        of availableMiners
      ) {
        list.appendChild(
          this.createAvailableMiner(
            item,
            rack,
            availableSlots,
            availablePower
          )
        );
      }

      inventorySection.appendChild(
        list
      );
    }

    layout.appendChild(
      inventorySection
    );

    this.content.appendChild(
      layout
    );
  }

  // ====================================================
  // INSTALLED MINER
  // ====================================================

  private createInstalledMiner(
    miner: MinerDefinition,
    index: number
  ): HTMLDivElement {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "installed-miner";

    row.innerHTML = `
      <div class="installed-miner-number">
        ${String(
          index + 1
        ).padStart(
          2,
          "0"
        )}
      </div>

      <div class="installed-miner-info">
        <strong>
          ${miner.name}
        </strong>

        <span>
          ${miner.manufacturer}
        </span>
      </div>

      <div class="installed-miner-stat">
        <span>
          HASHRATE
        </span>

        <strong>
          ${this.formatHashrate(
            miner.hashRate
          )}
        </strong>
      </div>

      <div class="installed-miner-stat">
        <span>
          POWER
        </span>

        <strong>
          ${this.formatPower(
            miner.powerUsage
          )}
        </strong>
      </div>

      <div class="installed-miner-status">
        ONLINE
      </div>
    `;

    return row;
  }

  // ====================================================
  // AVAILABLE MINER
  // ====================================================

  private createAvailableMiner(
    item: InventoryMinerItem,
    rack: RackInstance,
    availableSlots: number,
    availablePower: number
  ): HTMLDivElement {
    const miner =
      item.definition;

    const enoughSlots =
      miner.rackSlots <=
      availableSlots;

    const enoughPower =
      miner.powerUsage <=
      availablePower;

    const canInstall =
      enoughSlots &&
      enoughPower;

    let reason =
      "";

    if (!enoughSlots) {
      reason =
        `Requires ${miner.rackSlots}U rack space`;
    } else if (!enoughPower) {
      reason =
        "Rack power limit exceeded";
    }

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "available-miner";

    if (!canInstall) {
      row.classList.add(
        "unavailable"
      );
    }

    row.innerHTML = `
      <div class="available-miner-info">
        <span>
          MINING SERVER
        </span>

        <strong>
          ${miner.name}
        </strong>

        <small>
          ${miner.manufacturer}
        </small>
      </div>

      <div class="available-miner-specs">
        <div>
          <span>
            HASH
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
            SPACE
          </span>

          <strong>
            ${miner.rackSlots}U
          </strong>
        </div>
      </div>

      ${
        reason
          ? `
            <div class="available-miner-warning">
              ${reason}
            </div>
          `
          : ""
      }

      <button
        type="button"
        class="rack-install-button"
        ${
          canInstall
            ? ""
            : "disabled"
        }
      >
        ${
          canInstall
            ? "INSTALL"
            : "UNAVAILABLE"
        }
      </button>
    `;

    const button =
      row.querySelector<HTMLButtonElement>(
        ".rack-install-button"
      );

    button?.addEventListener(
      "click",
      () => {
        this.installMiner(
          rack,
          item
        );
      }
    );

    return row;
  }

  // ====================================================
  // INSTALL MINER
  // ====================================================

  private installMiner(
    rack: RackInstance,
    item: InventoryMinerItem
  ) {
    const miner =
      item.definition;

    // ----------------------------------------------
    // Make sure inventory item still exists.
    // ----------------------------------------------

    const storedItem =
      this.inventory.getItem(
        item.instanceId
      );

    if (
      !storedItem ||
      storedItem.type !==
        "miner"
    ) {
      this.render();
      return;
    }

    // ----------------------------------------------
    // Re-check rack capacity.
    // Never trust UI button state alone.
    // ----------------------------------------------

    const usedSlots =
      this.getUsedSlots(
        rack
      );

    const usedPower =
      this.getUsedPower(
        rack
      );

    if (
      usedSlots +
        miner.rackSlots >
      rack.definition.totalSlots
    ) {
      this.render();
      return;
    }

    if (
      usedPower +
        miner.powerUsage >
      rack.definition.maxPower
    ) {
      this.render();
      return;
    }

    // ----------------------------------------------
    // Remove from inventory.
    // ----------------------------------------------

    const removed =
      this.inventory.removeItem(
        item.instanceId
      );

    if (!removed) {
      this.render();
      return;
    }

    // ----------------------------------------------
    // Install into rack.
    // ----------------------------------------------

    rack.miners.push(
      miner
    );

    // ----------------------------------------------
    // Notify game.
    //
    // Later main.ts uses this to:
    // - create physical server mesh
    // - add hashrate
    // - add power usage
    // ----------------------------------------------

    this.onMinerInstalled(
      rack,
      miner,
      item
    );

    this.render();
  }

  // ====================================================
  // INVENTORY MINERS
  // ====================================================

  private getInventoryMiners():
    InventoryMinerItem[] {
    return this.inventory
      .getItems()
      .filter(
        (
          item
        ): item is
          InventoryMinerItem =>
          item.type === "miner"
      );
  }

  // ====================================================
  // USED SLOTS
  // ====================================================

  private getUsedSlots(
    rack: RackInstance
  ): number {
    return rack.miners.reduce(
      (
        total,
        miner
      ) =>
        total +
        miner.rackSlots,
      0
    );
  }

  // ====================================================
  // USED POWER
  // ====================================================

  private getUsedPower(
    rack: RackInstance
  ): number {
    return rack.miners.reduce(
      (
        total,
        miner
      ) =>
        total +
        miner.powerUsage,
      0
    );
  }

  // ====================================================
  // HASHRATE
  // ====================================================

  private getTotalHashrate(
    rack: RackInstance
  ): number {
    return rack.miners.reduce(
      (
        total,
        miner
      ) =>
        total +
        miner.hashRate,
      0
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
        2
      )} kW`;
    }

    return `${watts.toFixed(
      0
    )} W`;
  }

  // ====================================================
  // FORMAT HASHRATE
  // ====================================================

  private formatHashrate(
    hashRate: number
  ): string {
    if (
      hashRate >=
      1_000_000
    ) {
      return `${(
        hashRate /
        1_000_000
      ).toFixed(
        2
      )} TH/s`;
    }

    if (
      hashRate >= 1000
    ) {
      return `${(
        hashRate / 1000
      ).toFixed(
        2
      )} GH/s`;
    }

    return `${hashRate.toFixed(
      0
    )} MH/s`;
  }
}
