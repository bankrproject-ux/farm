import type {
  RackInstance,
  InstalledMiner,
} from "../mining/RackTypes";

import {
  getUsedSlots,
  getRackPowerUsage,
  getInstalledPowerRequirement,
  getRackHashrate,
  findAvailableSlot,
  canInstallMiner,
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
  installedMiner: InstalledMiner,
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
    // CLOSE BUTTON
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
  // CURRENT RACK
  // ====================================================

  public getCurrentRack():
    RackInstance | null {
    return this.currentRack;
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
      getUsedSlots(
        rack
      );

    const usedPower =
      getRackPowerUsage(
        rack
      );

    const requiredPower =
      getInstalledPowerRequirement(
        rack
      );

    const totalHashrate =
      getRackHashrate(
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
          requiredPower
      );

    this.content.innerHTML =
      "";

    // ==================================================
    // SUMMARY
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
    // MAIN LAYOUT
    // ==================================================

    const layout =
      document.createElement(
        "div"
      );

    layout.className =
      "rack-management-layout";

    // ==================================================
    // INSTALLED SERVERS
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
          No mining servers installed.
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

      const sortedMiners =
        [...rack.miners].sort(
          (a, b) =>
            a.slotIndex -
            b.slotIndex
        );

      for (
        const installed
        of sortedMiners
      ) {
        installedList.appendChild(
          this.createInstalledMiner(
            installed
          )
        );
      }

      installedSection.appendChild(
        installedList
      );
    }

    layout.appendChild(
      installedSection
    );

    // ==================================================
    // AVAILABLE SERVERS
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
      availableMiners.length === 0
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
            rack
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
  // INSTALLED MINER ROW
  // ====================================================

  private createInstalledMiner(
    installed:
      InstalledMiner
  ): HTMLDivElement {
    const miner =
      installed.miner;

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "installed-miner";

    row.innerHTML = `
      <div class="installed-miner-number">
        ${String(
          installed.slotIndex + 1
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
          ${
            installed.powered
              ? this.formatHashrate(
                  miner.hashRate
                )
              : "0 MH/s"
          }
        </strong>
      </div>

      <div class="installed-miner-stat">
        <span>
          POWER
        </span>

        <strong>
          ${
            installed.powered
              ? this.formatPower(
                  miner.powerUsage
                )
              : "0 W"
          }
        </strong>
      </div>

      <div class="installed-miner-status">
        ${
          installed.powered
            ? "ONLINE"
            : "OFFLINE"
        }
      </div>
    `;

    return row;
  }

  // ====================================================
  // AVAILABLE MINER ROW
  // ====================================================

  private createAvailableMiner(
    item: InventoryMinerItem,
    rack: RackInstance
  ): HTMLDivElement {
    const miner =
      item.definition;

    const slotIndex =
      findAvailableSlot(
        rack,
        miner
      );

    const enoughSlots =
      slotIndex !== null;

    const requiredPower =
      getInstalledPowerRequirement(
        rack
      ) +
      miner.powerUsage;

    const enoughPower =
      requiredPower <=
      rack.definition.maxPower;

    const installable =
      canInstallMiner(
        rack,
        miner
      );

    let reason =
      "";

    if (!enoughSlots) {
      reason =
        `Requires ${miner.rackSlots} consecutive rack slot${
          miner.rackSlots === 1
            ? ""
            : "s"
        }`;
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

    if (!installable) {
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
          installable
            ? ""
            : "disabled"
        }
      >
        ${
          installable
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
    // Make sure the item still exists.

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

    const miner:
      MinerDefinition =
      storedItem.definition;

    // ----------------------------------------------
    // Check rack limits again.
    // ----------------------------------------------

    if (
      !canInstallMiner(
        rack,
        miner
      )
    ) {
      this.render();
      return;
    }

    // ----------------------------------------------
    // Find actual consecutive slot range.
    // ----------------------------------------------

    const slotIndex =
      findAvailableSlot(
        rack,
        miner
      );

    if (
      slotIndex === null
    ) {
      this.render();
      return;
    }

    // ----------------------------------------------
    // Create the correct InstalledMiner object.
    // ----------------------------------------------

    const installedMiner:
      InstalledMiner = {
        instanceId:
          item.instanceId,

        miner,

        slotIndex,

        powered: true,
      };

    // ----------------------------------------------
    // Remove from storage.
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
    // Add to physical rack.
    // ----------------------------------------------

    rack.miners.push(
      installedMiner
    );

    // ----------------------------------------------
    // Notify main game.
    // ----------------------------------------------

    this.onMinerInstalled(
      rack,
      installedMiner,
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
          item.type ===
          "miner"
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
        hashRate /
        1000
      ).toFixed(
        2
      )} GH/s`;
    }

    return `${hashRate.toFixed(
      0
    )} MH/s`;
  }
}
