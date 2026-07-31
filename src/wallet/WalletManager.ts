import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";

import {
  ROBINHOOD_CHAIN,
} from "../config/ChainConfig";

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
// ROBINHOOD VIEM CHAIN
// ======================================================

const robinhoodChain = {
  id:
    ROBINHOOD_CHAIN.chainId,

  name:
    ROBINHOOD_CHAIN.name,

  nativeCurrency: {
    name:
      ROBINHOOD_CHAIN.currency.name,

    symbol:
      ROBINHOOD_CHAIN.currency.symbol,

    decimals:
      ROBINHOOD_CHAIN.currency.decimals,
  },

  rpcUrls: {
    default: {
      http: [
        ROBINHOOD_CHAIN.rpcUrl,
      ],
    },
  },

  blockExplorers: {
    default: {
      name:
        "Robinhood Chain Explorer",

      url:
        ROBINHOOD_CHAIN.blockExplorer,
    },
  },
} as const;

// ======================================================
// PUBLIC CLIENT
// ======================================================
//
// Used to verify that the transaction was actually
// included successfully on Robinhood Chain.
//
// ======================================================

const publicClient =
  createPublicClient({
    chain:
      robinhoodChain,

    transport:
      http(
        ROBINHOOD_CHAIN.rpcUrl
      ),
  });

// ======================================================
// WALLET MANAGER
// ======================================================

export default class WalletManager {
  private walletClient:
    WalletClient | null =
      null;

  private state:
    WalletState = {
      connected: false,

      address: null,

      chainId: null,
    };

  private listeners:
    WalletStateListener[] =
      [];

  private provider:
    EthereumProvider | null =
      null;

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
    if (
      !this.provider
    ) {
      throw new Error(
        "No EVM wallet detected."
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

    this.createWalletClient();

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
  // CREATE WALLET CLIENT
  // ====================================================

  private createWalletClient() {
    if (
      !this.provider
    ) {
      this.walletClient =
        null;

      return;
    }

    this.walletClient =
      createWalletClient({
        transport:
          custom(
            this.provider as any
          ),
      });
  }

  // ====================================================
  // RESTORE CONNECTION
  // ====================================================

  public async restoreConnection() {
    if (
      !this.provider
    ) {
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

      this.createWalletClient();

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
  // ENSURE ROBINHOOD CHAIN
  // ====================================================
  //
  // BUY is not allowed to continue on Base,
  // Ethereum, Arbitrum, etc.
  //
  // If Robinhood Chain is already configured:
  // -> switch
  //
  // If it isn't configured:
  // -> add network
  // -> switch
  //
  // ====================================================

  public async ensureRobinhoodChain():
    Promise<void> {
    if (
      !this.provider
    ) {
      throw new Error(
        "Wallet provider unavailable."
      );
    }

    const currentChainId =
      await this.getProviderChainId();

    if (
      currentChainId ===
      ROBINHOOD_CHAIN.chainId
    ) {
      this.state = {
        ...this.state,

        chainId:
          currentChainId,
      };

      this.notifyListeners();

      return;
    }

    // ==================================================
    // TRY SWITCH
    // ==================================================

    try {
      await this.provider.request({
        method:
          "wallet_switchEthereumChain",

        params: [
          {
            chainId:
              ROBINHOOD_CHAIN.chainIdHex,
          },
        ],
      });
    } catch (error: any) {
      // ----------------------------------------------
      // 4902 generally means network is unknown
      // to the wallet.
      // ----------------------------------------------

      if (
        error?.code !== 4902
      ) {
        throw new Error(
          "Please switch your wallet to Robinhood Chain."
        );
      }

      // =================================================
      // ADD ROBINHOOD CHAIN
      // =================================================

      await this.provider.request({
        method:
          "wallet_addEthereumChain",

        params: [
          {
            chainId:
              ROBINHOOD_CHAIN.chainIdHex,

            chainName:
              ROBINHOOD_CHAIN.name,

            nativeCurrency: {
              name:
                ROBINHOOD_CHAIN.currency.name,

              symbol:
                ROBINHOOD_CHAIN.currency.symbol,

              decimals:
                ROBINHOOD_CHAIN.currency.decimals,
            },

            rpcUrls: [
              ROBINHOOD_CHAIN.rpcUrl,
            ],

            blockExplorerUrls: [
              ROBINHOOD_CHAIN.blockExplorer,
            ],
          },
        ],
      });

      // =================================================
      // SWITCH AFTER ADD
      // =================================================

      await this.provider.request({
        method:
          "wallet_switchEthereumChain",

        params: [
          {
            chainId:
              ROBINHOOD_CHAIN.chainIdHex,
          },
        ],
      });
    }

    // ==================================================
    // VERIFY NETWORK AFTER SWITCH
    // ==================================================

    const switchedChainId =
      await this.getProviderChainId();

    if (
      switchedChainId !==
      ROBINHOOD_CHAIN.chainId
    ) {
      throw new Error(
        "Wallet is not connected to Robinhood Chain."
      );
    }

    this.state = {
      ...this.state,

      chainId:
        switchedChainId,
    };

    this.notifyListeners();
  }

  // ====================================================
  // SEND ETH
  // ====================================================
  //
  // IMPORTANT:
  //
  // This function:
  //
  // 1. Forces Robinhood Chain.
  // 2. Sends ETH.
  // 3. Waits for the transaction receipt.
  // 4. Requires receipt.status === success.
  // 5. Returns tx hash only after confirmation.
  //
  // ====================================================

  public async sendEth(
    to: Address,
    amountEth: string
  ): Promise<Hash> {
    if (
      !this.state.address
    ) {
      throw new Error(
        "Wallet is not connected."
      );
    }

    if (
      !/^0x[a-fA-F0-9]{40}$/.test(
        to
      )
    ) {
      throw new Error(
        "Invalid treasury address."
      );
    }

    // ==================================================
    // FORCE ROBINHOOD MAINNET
    // ==================================================

    await this.ensureRobinhoodChain();

    // ==================================================
    // WALLET CLIENT CHECK
    // ==================================================

    if (
      !this.walletClient
    ) {
      this.createWalletClient();
    }

    if (
      !this.walletClient
    ) {
      throw new Error(
        "Wallet client unavailable."
      );
    }

    // ==================================================
    // PARSE ETH
    // ==================================================

    let value:
      bigint;

    try {
      value =
        parseEther(
          amountEth.trim()
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

    // ==================================================
    // FINAL CHAIN CHECK
    // ==================================================

    const chainId =
      await this.getProviderChainId();

    if (
      chainId !==
      ROBINHOOD_CHAIN.chainId
    ) {
      throw new Error(
        "Wrong network. Transaction cancelled."
      );
    }

    // ==================================================
    // SEND TRANSACTION
    // ==================================================

    const hash =
      await this.walletClient.sendTransaction({
        account:
          this.state.address,

        chain:
          robinhoodChain,

        to,

        value,
      });

    console.log(
      "Transaction submitted:",
      hash
    );

    // ==================================================
    // WAIT FOR RECEIPT
    // ==================================================

    const receipt =
      await publicClient
        .waitForTransactionReceipt({
          hash,

          confirmations:
            1,

          timeout:
            120_000,
        });

    // ==================================================
    // RECEIPT CHECK
    // ==================================================

    if (
      receipt.status !==
      "success"
    ) {
      throw new Error(
        "Transaction reverted on Robinhood Chain."
      );
    }

    // ==================================================
    // VERIFY DESTINATION
    // ==================================================
    //
    // Normal ETH transfers have no contractAddress.
    // We retrieve the transaction itself to verify
    // destination and value.
    // ==================================================

    const transaction =
      await publicClient
        .getTransaction({
          hash,
        });

    if (
      !transaction.to ||
      transaction.to.toLowerCase() !==
        to.toLowerCase()
    ) {
      throw new Error(
        "Transaction destination verification failed."
      );
    }

    if (
      transaction.value !==
      value
    ) {
      throw new Error(
        "Transaction value verification failed."
      );
    }

    console.log(
      "Hardware payment confirmed:",
      hash
    );

    return hash;
  }

  // ====================================================
  // GET PROVIDER CHAIN ID
  // ====================================================

  private async getProviderChainId():
    Promise<number | null> {
    if (
      !this.provider
    ) {
      return null;
    }

    try {
      const chainIdHex =
        await this.provider.request({
          method:
            "eth_chainId",
        }) as string;

      const chainId =
        parseInt(
          chainIdHex,
          16
        );

      if (
        Number.isNaN(
          chainId
        )
      ) {
        return null;
      }

      return chainId;
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

      this.createWalletClient();

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
  // DISCONNECT
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
  // MANUAL DISCONNECT / SWITCH WALLET
  // ====================================================

  public async disconnect():
    Promise<void> {
    if (
      this.provider
    ) {
      try {
        // MetaMask and some EIP-1193 wallets support
        // revoking account permissions.
        await this.provider.request({
          method:
            "wallet_revokePermissions",

          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      } catch (error) {
        // Not every wallet supports
        // wallet_revokePermissions.
        //
        // We still clear the game's local wallet state
        // so the user can reconnect / switch account.
        console.warn(
          "Wallet permission revoke not supported:",
          error
        );
      }
    }

    this.clearConnection();
  }
  
  // ====================================================
  // ADDRESS
  // ====================================================

  public getAddress():
    Address | null {
    return this.state.address;
  }

  // ====================================================
  // CHAIN
  // ====================================================

  public getChainId():
    number | null {
    return this.state.chainId;
  }

  // ====================================================
  // CONNECTED
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

    if (
      !address
    ) {
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
