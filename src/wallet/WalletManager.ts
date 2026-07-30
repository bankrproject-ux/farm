import {
  createWalletClient,
  custom,
  type Address,
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

    // --------------------------------------------------
    // REQUEST ACCOUNTS
    //
    // This triggers the wallet connection popup.
    // --------------------------------------------------

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

    // --------------------------------------------------
    // CREATE VIEM WALLET CLIENT
    // --------------------------------------------------

    this.walletClient =
      createWalletClient({
        transport:
          custom(
            this.provider as any
          ),
      });

    // --------------------------------------------------
    // CHAIN ID
    // --------------------------------------------------

    const chainId =
      await this.getProviderChainId();

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------

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
  //
  // IMPORTANT:
  //
  // eth_accounts does NOT open a wallet popup.
  //
  // If the user previously connected this website,
  // we can restore the visible wallet state after
  // refresh.
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
  //
  // We'll use this next for authentication.
  //
  // Connecting a wallet alone is NOT enough to prove
  // ownership of the address.
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

    // --------------------------------------------------
    // ACCOUNT CHANGE
    // --------------------------------------------------

    this.provider.on(
      "accountsChanged",
      this.handleAccountsChanged
    );

    // --------------------------------------------------
    // NETWORK CHANGE
    // --------------------------------------------------

    this.provider.on(
      "chainChanged",
      this.handleChainChanged
    );

    // --------------------------------------------------
    // PROVIDER DISCONNECT
    // --------------------------------------------------

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
