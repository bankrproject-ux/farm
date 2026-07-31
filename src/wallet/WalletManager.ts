import {
  createWalletClient,
  custom,
  parseEther,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";

// ======================================================
// MINING TYCOON 3D
// EVM WALLET MANAGER
// ======================================================

export type WalletState = {
  connected: boolean;

  address: Address | null;

  chainId: number | null;
};

export type WalletStateListener = (
  state: WalletState
) => void;

// ======================================================
// EIP-1193 PROVIDER
// ======================================================

type EthereumProvider = {
  request: (
    args: {
      method: string;
      params?: unknown[];
    }
  ) => Promise<unknown>;

  on?: (
    event: string,
    listener: (...args: any[]) => void
  ) => void;

  removeListener?: (
    event: string,
    listener: (...args: any[]) => void
  ) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// ======================================================
// WALLET MANAGER
// ======================================================

export default class WalletManager {
  private walletClient:
    WalletClient | null = null;

  private state:
    WalletState = {
      connected: false,

      address: null,

      chainId: null,
    };

  private listeners:
    WalletStateListener[] = [];

  private provider:
    EthereumProvider | null = null;

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor() {
    this.provider =
      window.ethereum ??
      null;

    this.bindProviderEvents();

    void this.restoreConnection();
  }

  // ====================================================
  // WALLET AVAILABLE
  // ====================================================

  public isWalletAvailable():
    boolean {
    return (
      this.provider !==
      null
    );
  }

  // ====================================================
  // CONNECT
  // ====================================================

  public async connect():
    Promise<WalletState> {
    if (!this.provider) {
      throw new Error(
        "No EVM wallet detected. Install or open an EVM-compatible wallet."
      );
    }

    const accounts =
      await this.provider.request({
        method:
          "eth_requestAccounts",
      }) as string[];

    if (
      !accounts ||
      accounts.length === 0
    ) {
      throw new Error(
        "Wallet did not return an account."
      );
    }

    const address =
      accounts[0] as Address;

    this.walletClient =
      createWalletClient({
        transport:
          custom(
            this.provider as any
          ),
      });

    const chainId =
      await this.getProviderChainId();

    this.state = {
      connected: true,

      address,

      chainId,
    };

    this.notifyListeners();

    return this.getState();
  }

  // ====================================================
  // RESTORE CONNECTION
  // ====================================================

  public async restoreConnection() {
    if (!this.provider) {
      return;
    }

    try {
      const accounts =
        await this.provider.request({
          method:
            "eth_accounts",
        }) as string[];

      if (
        !accounts ||
        accounts.length === 0
      ) {
        return;
      }

      const address =
        accounts[0] as Address;

      this.walletClient =
        createWalletClient({
          transport:
            custom(
              this.provider as any
            ),
        });

      const chainId =
        await this.getProviderChainId();

      this.state = {
        connected: true,

        address,

        chainId,
      };

      this.notifyListeners();
    } catch (error) {
      console.warn(
        "Could not restore wallet connection:",
        error
      );
    }
  }

  // ====================================================
  // SIGN MESSAGE
  // ====================================================

  public async signMessage(
    message: string
  ): Promise<string> {
    if (
      !this.walletClient ||
      !this.state.address
    ) {
      throw new Error(
        "Wallet is not connected."
      );
    }

    const signature =
      await this.walletClient.signMessage({
        account:
          this.state.address,

        message,
      });

    return signature;
  }

  // ====================================================
  // SEND ETH
  // ====================================================
  //
  // Used by the hardware shop.
  //
  // Example:
  //
  // Player
  //   ↓
  // 0.0005 ETH
  //   ↓
  // Treasury wallet
  //
  // This method ONLY requests the transaction.
  //
  // A successful return value means the wallet/provider
  // accepted and broadcast the transaction.
  //
  // Later the backend will independently verify:
  //
  // - transaction receipt
  // - chain
  // - sender
  // - treasury recipient
  // - ETH amount
  // - transaction hash has not been used before
  //
  // before permanently granting purchased hardware.
  // ====================================================

  public async sendEth(
    to: Address,
    amountEth: string
  ): Promise<Hash> {
    if (
      !this.walletClient ||
      !this.state.address
    ) {
      throw new Error(
        "Wallet is not connected."
      );
    }

    if (
      !to ||
      !/^0x[a-fA-F0-9]{40}$/.test(
        to
      )
    ) {
      throw new Error(
        "Invalid treasury address."
      );
    }

    const normalizedAmount =
      amountEth.trim();

    if (
      normalizedAmount.length ===
      0
    ) {
      throw new Error(
        "Invalid ETH amount."
      );
    }

    let value: bigint;

    try {
      value =
        parseEther(
          normalizedAmount
        );
    } catch {
      throw new Error(
        "Invalid ETH amount."
      );
    }

    if (
      value <= 0n
    ) {
      throw new Error(
        "ETH amount must be greater than zero."
      );
    }

    const hash =
      await this.walletClient.sendTransaction({
        account:
          this.state.address,

        to,

        value,

        chain:
          null,
      });

    return hash;
  }

  // ====================================================
  // GET CHAIN ID
  // ====================================================

  private async getProviderChainId():
    Promise<number | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const chainIdHex =
        await this.provider.request({
          method:
            "eth_chainId",
        }) as string;

      return parseInt(
        chainIdHex,
        16
      );
    } catch {
      return null;
    }
  }

  // ====================================================
  // PROVIDER EVENTS
  // ====================================================

  private bindProviderEvents() {
    if (
      !this.provider?.on
    ) {
      return;
    }

    this.provider.on(
      "accountsChanged",
      this.handleAccountsChanged
    );

    this.provider.on(
      "chainChanged",
      this.handleChainChanged
    );

    this.provider.on(
      "disconnect",
      this.handleDisconnect
    );
  }

  // ====================================================
  // ACCOUNT CHANGED
  // ====================================================

  private handleAccountsChanged =
    (...args: any[]) => {
      const accounts =
        args[0] as string[];

      if (
        !accounts ||
        accounts.length === 0
      ) {
        this.clearConnection();

        return;
      }

      this.state = {
        ...this.state,

        connected: true,

        address:
          accounts[0] as Address,
      };

      this.notifyListeners();
    };

  // ====================================================
  // CHAIN CHANGED
  // ====================================================

  private handleChainChanged =
    (...args: any[]) => {
      const chainIdHex =
        args[0] as string;

      const chainId =
        parseInt(
          chainIdHex,
          16
        );

      this.state = {
        ...this.state,

        chainId:
          Number.isNaN(
            chainId
          )
            ? null
            : chainId,
      };

      this.notifyListeners();
    };

  // ====================================================
  // DISCONNECT EVENT
  // ====================================================

  private handleDisconnect =
    () => {
      this.clearConnection();
    };

  // ====================================================
  // CLEAR CONNECTION
  // ====================================================

  private clearConnection() {
    this.walletClient =
      null;

    this.state = {
      connected: false,

      address: null,

      chainId: null,
    };

    this.notifyListeners();
  }

  // ====================================================
  // GET STATE
  // ====================================================

  public getState():
    WalletState {
    return {
      ...this.state,
    };
  }

  // ====================================================
  // GET ADDRESS
  // ====================================================

  public getAddress():
    Address | null {
    return this.state.address;
  }

  // ====================================================
  // GET CHAIN
  // ====================================================

  public getChainId():
    number | null {
    return this.state.chainId;
  }

  // ====================================================
  // IS CONNECTED
  // ====================================================

  public isConnected():
    boolean {
    return (
      this.state.connected &&
      this.state.address !==
        null
    );
  }

  // ====================================================
  // SHORT ADDRESS
  // ====================================================

  public getShortAddress():
    string {
    const address =
      this.state.address;

    if (!address) {
      return "";
    }

    return `${address.slice(
      0,
      6
    )}...${address.slice(
      -4
    )}`;
  }

  // ====================================================
  // SUBSCRIBE
  // ====================================================

  public subscribe(
    listener:
      WalletStateListener
  ) {
    this.listeners.push(
      listener
    );

    listener(
      this.getState()
    );

    return () => {
      this.listeners =
        this.listeners.filter(
          (current) =>
            current !==
            listener
        );
    };
  }

  // ====================================================
  // NOTIFY
  // ====================================================

  private notifyListeners() {
    const state =
      this.getState();

    for (
      const listener
      of this.listeners
    ) {
      listener(
        state
      );
    }
  }

  // ====================================================
  // DESTROY
  // ====================================================

  public destroy() {
    if (
      !this.provider
        ?.removeListener
    ) {
      return;
    }

    this.provider.removeListener(
      "accountsChanged",
      this.handleAccountsChanged
    );

    this.provider.removeListener(
      "chainChanged",
      this.handleChainChanged
    );

    this.provider.removeListener(
      "disconnect",
      this.handleDisconnect
    );
  }
}
