import type {
  OfflineMiningResult,
} from "../save/GameSaveManager";

// ======================================================
// MINING TYCOON 3D
// OFFLINE MINING UI
// ======================================================

export default class OfflineMiningUI {
  private overlay:
    HTMLDivElement;

  private panel:
    HTMLDivElement;

  private visible =
    false;

  private onClose:
    (() => void) | null =
      null;

  constructor() {
    // ==================================================
    // OVERLAY
    // ==================================================

    this.overlay =
      document.createElement(
        "div"
      );

    this.overlay.style.position =
      "fixed";

    this.overlay.style.inset =
      "0";

    this.overlay.style.zIndex =
      "99999";

    this.overlay.style.display =
      "none";

    this.overlay.style.alignItems =
      "center";

    this.overlay.style.justifyContent =
      "center";

    this.overlay.style.background =
      "rgba(3, 7, 12, 0.82)";

    this.overlay.style.backdropFilter =
      "blur(8px)";

    // ==================================================
    // PANEL
    // ==================================================

    this.panel =
      document.createElement(
        "div"
      );

    this.panel.style.width =
      "min(440px, calc(100vw - 32px))";

    this.panel.style.boxSizing =
      "border-box";

    this.panel.style.padding =
      "30px";

    this.panel.style.border =
      "1px solid rgba(73, 166, 255, 0.35)";

    this.panel.style.borderRadius =
      "14px";

    this.panel.style.background =
      "linear-gradient(180deg, rgba(18, 27, 38, 0.98), rgba(8, 13, 20, 0.98))";

    this.panel.style.boxShadow =
      "0 30px 100px rgba(0, 0, 0, 0.65)";

    this.panel.style.fontFamily =
      "Inter, system-ui, sans-serif";

    this.panel.style.color =
      "#ffffff";

    this.overlay.appendChild(
      this.panel
    );

    document.body.appendChild(
      this.overlay
    );

    // ==================================================
    // CLICK OUTSIDE
    // ==================================================

    this.overlay.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          this.overlay
        ) {
          this.close();
        }
      }
    );

    // ==================================================
    // ESC
    // ==================================================

    window.addEventListener(
      "keydown",
      (event) => {
        if (
          event.code !==
            "Escape" ||
          !this.visible
        ) {
          return;
        }

        event.preventDefault();

        event.stopPropagation();

        this.close();
      },
      true
    );
  }

  // ====================================================
  // SHOW
  // ====================================================

  public show(
    result: OfflineMiningResult,
    onClose?: () => void
  ) {
    if (
      !Number.isFinite(
        result.tyconEarned
      ) ||
      result.tyconEarned <= 0
    ) {
      return;
    }

    this.onClose =
      onClose ?? null;

    const timeAway =
      this.formatDuration(
        result.rewardedSeconds
      );

    const elapsed =
      this.formatDuration(
        result.elapsedSeconds
      );

    const hashrate =
      this.formatHashrate(
        result.activeHashrate
      );

    const powerUsed =
      this.formatPower(
        result.powerUsed
      );

    const powerCapacity =
      this.formatPower(
        result.powerCapacity
      );

    const reward =
      this.formatTycon(
        result.tyconEarned
      );

    const capNotice =
      result.capped
        ? `
          <div style="
            margin-top: 14px;
            padding: 10px 12px;
            border: 1px solid rgba(255, 190, 80, 0.25);
            border-radius: 8px;
            background: rgba(255, 170, 50, 0.07);
            color: #ffc46b;
            font-size: 11px;
            letter-spacing: 0.8px;
          ">
            OFFLINE REWARD CAPPED AT 12 HOURS
          </div>
        `
        : "";

    this.panel.innerHTML = `
      <div style="
        font-size: 11px;
        letter-spacing: 3px;
        color: #62b4ff;
        font-weight: 700;
        margin-bottom: 8px;
      ">
        MINING TYCOON
      </div>

      <div style="
        font-size: 26px;
        font-weight: 900;
        letter-spacing: 1px;
        margin-bottom: 4px;
      ">
        OFFLINE MINING
      </div>

      <div style="
        color: #8796a8;
        font-size: 13px;
        margin-bottom: 26px;
      ">
        Your facility kept mining while you were away.
      </div>

      <div style="
        display: grid;
        gap: 10px;
      ">
        ${this.createRow(
          "TIME AWAY",
          elapsed
        )}

        ${this.createRow(
          "REWARDED TIME",
          timeAway
        )}

        ${this.createRow(
          "ACTIVE HASHRATE",
          hashrate
        )}

        ${this.createRow(
          "POWER USAGE",
          `${powerUsed} / ${powerCapacity}`
        )}
      </div>

      ${capNotice}

      <div style="
        margin-top: 24px;
        padding: 22px 16px;
        border-radius: 10px;
        text-align: center;
        background: rgba(39, 151, 255, 0.08);
        border: 1px solid rgba(62, 165, 255, 0.22);
      ">
        <div style="
          color: #8494a7;
          font-size: 10px;
          letter-spacing: 2px;
          font-weight: 700;
          margin-bottom: 7px;
        ">
          MINED WHILE OFFLINE
        </div>

        <div style="
          font-size: 30px;
          line-height: 1;
          font-weight: 900;
          color: #58b6ff;
        ">
          +${reward}
        </div>
      </div>

      <button
        data-offline-collect
        type="button"
        style="
          width: 100%;
          margin-top: 20px;
          height: 48px;
          border: 0;
          border-radius: 9px;
          cursor: pointer;
          background: #2b9cff;
          color: #ffffff;
          font-size: 12px;
          letter-spacing: 2px;
          font-weight: 900;
        "
      >
        COLLECT
      </button>
    `;

    const collectButton =
      this.panel.querySelector<HTMLButtonElement>(
        "[data-offline-collect]"
      );

    collectButton?.addEventListener(
      "click",
      () => {
        this.close();
      }
    );

    this.overlay.style.display =
      "flex";

    this.visible =
      true;

    // Release pointer lock so the player
    // can actually click COLLECT.

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
    if (!this.visible) {
      return;
    }

    this.visible =
      false;

    this.overlay.style.display =
      "none";

    const callback =
      this.onClose;

    this.onClose =
      null;

    callback?.();
  }

  // ====================================================
  // IS OPEN
  // ====================================================

  public isOpen():
    boolean {
    return this.visible;
  }

  // ====================================================
  // ROW
  // ====================================================

  private createRow(
    label: string,
    value: string
  ): string {
    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      ">
        <span style="
          color: #77879a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.4px;
        ">
          ${label}
        </span>

        <strong style="
          font-size: 13px;
          color: #eaf4ff;
        ">
          ${value}
        </strong>
      </div>
    `;
  }

  // ====================================================
  // FORMAT DURATION
  // ====================================================

  private formatDuration(
    seconds: number
  ): string {
    const safeSeconds =
      Math.max(
        0,
        Math.floor(
          seconds
        )
      );

    const hours =
      Math.floor(
        safeSeconds /
        3600
      );

    const minutes =
      Math.floor(
        (
          safeSeconds %
          3600
        ) /
          60
      );

    const remainingSeconds =
      safeSeconds %
      60;

    if (
      hours > 0
    ) {
      return `${hours}h ${minutes}m`;
    }

    if (
      minutes > 0
    ) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  }

  // ====================================================
  // FORMAT HASHRATE
  // ====================================================

  private formatHashrate(
    value: number
  ): string {
    if (
      value >= 1_000_000
    ) {
      return `${(
        value /
        1_000_000
      ).toFixed(2)} TH/s`;
    }

    if (
      value >= 1000
    ) {
      return `${(
        value /
        1000
      ).toFixed(2)} GH/s`;
    }

    return `${value.toFixed(
      0
    )} MH/s`;
  }

  // ====================================================
  // FORMAT POWER
  // ====================================================

  private formatPower(
    value: number
  ): string {
    if (
      value >= 1000
    ) {
      return `${(
        value /
        1000
      ).toFixed(2)} kW`;
    }

    return `${value.toFixed(
      0
    )} W`;
  }

  // ====================================================
  // FORMAT TYCON
  // ====================================================

  private formatTycon(
    value: number
  ): string {
    return `${value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }
    )} TYCON`;
  }
}
