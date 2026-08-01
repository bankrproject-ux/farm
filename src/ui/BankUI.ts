import GameState from "../game/GameState";
import WalletManager from "../wallet/WalletManager";

export default class BankUI {
  private root: HTMLDivElement;

  private balanceLabel: HTMLElement;

  private amountInput: HTMLInputElement;

  private withdrawButton: HTMLButtonElement;

  private openButton: HTMLButtonElement;

  private isOpen = false;

  constructor(
    private readonly wallet: WalletManager,
    private readonly gameState: GameState
  ) {
    // ==================================================
    // OPEN BUTTON
    // ==================================================

    this.openButton =
      document.createElement(
        "button"
      );

    this.openButton.className =
      "bank-open-button";

    this.openButton.textContent =
      "BANK";

    document.body.appendChild(
      this.openButton
    );

    // ==================================================
    // WINDOW
    // ==================================================

    this.root =
      document.createElement(
        "div"
      );

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

        </div>

        <div class="bank-minimum">

          Minimum Withdraw

          <strong>

            50 TYCON

          </strong>

        </div>

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

    // ==================================================
    // EVENTS
    // ==================================================

    this.openButton.onclick =
      () => this.open();

    this.root
      .querySelector(
        "#bank-close"
      )!
      .addEventListener(
        "click",
        () => this.close()
      );

    this.withdrawButton.addEventListener(
      "click",
      async () => {
        await this.withdraw();
      }
    );

    gameState.subscribe(
      () => this.refresh()
    );

    this.refresh();
  }

  public isOpened() {
    return this.isOpen;
  }

  public open() {
    this.refresh();

    this.isOpen = true;

    this.root.classList.remove(
      "hidden"
    );
  }

  public close() {
    this.isOpen = false;

    this.root.classList.add(
      "hidden"
    );
  }

  private refresh() {
    this.balanceLabel.textContent =
      `${this.gameState
        .getTyconBalance()
        .toLocaleString(
          "en-US",
          {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          }
        )} TYCON`;
  }

  private async withdraw() {

    const amount =
      Number(
        this.amountInput.value
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount < 50
    ) {
      alert(
        "Minimum withdraw is 50 TYCON."
      );

      return;
    }

    if (
      amount >
      this.gameState.getTyconBalance()
    ) {
      alert(
        "Insufficient TYCON balance."
      );

      return;
    }

    // ===============================================
    // NEXT STEP
    //
    // Wallet Sign
    //
    // Backend Withdraw API
    //
    // Mint TYCON
    // ===============================================

    alert(
      `Withdraw ${amount} TYCON\n\nComing next step.`
    );
  }
}
