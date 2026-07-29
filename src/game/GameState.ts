// ======================================================
// MINING TYCOON 3D
// Global Game State
// ======================================================

export type GameStateListener = (
  state: GameState
) => void;

export default class GameState {
  // ====================================================
  // PLAYER ECONOMY
  // ====================================================

  private balance = 5000;

  // Total mining hashrate in MH/s.
  private totalHashrate = 0;

  // Total power consumption in watts.
  private totalPowerUsage = 0;

  // ====================================================
  // ECONOMY SETTINGS
  // ====================================================

  /*
   * Revenue generated per MH/s every second.
   *
   * This is intentionally game-like rather than
   * attempting to simulate real cryptocurrency prices.
   *
   * We can balance this later.
   */
  private readonly revenuePerMHPerSecond =
    0.00015;

  /*
   * Electricity price:
   * $0.12 per kWh.
   */
  private electricityPricePerKWh =
    0.12;

  // ====================================================
  // STATISTICS
  // ====================================================

  private totalRevenue = 0;

  private totalElectricityCost = 0;

  private totalProfit = 0;

  // ====================================================
  // EVENT LISTENERS
  // ====================================================

  private listeners:
    GameStateListener[] = [];

  // ====================================================
  // UPDATE
  // ====================================================

  public update(delta: number) {
    if (
      this.totalHashrate <= 0 &&
      this.totalPowerUsage <= 0
    ) {
      return;
    }

    // ----------------------------------------------
    // MINING REVENUE
    // ----------------------------------------------

    const revenue =
      this.totalHashrate *
      this.revenuePerMHPerSecond *
      delta;

    // ----------------------------------------------
    // ELECTRICITY COST
    //
    // Convert watts -> kW
    // Then convert seconds -> hours.
    // ----------------------------------------------

    const powerKW =
      this.totalPowerUsage / 1000;

    const hours =
      delta / 3600;

    const electricityCost =
      powerKW *
      hours *
      this.electricityPricePerKWh;

    // ----------------------------------------------
    // PROFIT
    // ----------------------------------------------

    const profit =
      revenue -
      electricityCost;

    this.balance += profit;

    this.totalRevenue +=
      revenue;

    this.totalElectricityCost +=
      electricityCost;

    this.totalProfit +=
      profit;

    this.notifyListeners();
  }

  // ====================================================
  // PURCHASE
  // ====================================================

  public canAfford(
    price: number
  ): boolean {
    return (
      this.balance >= price
    );
  }

  public spend(
    amount: number
  ): boolean {
    if (
      amount <= 0
    ) {
      return false;
    }

    if (
      !this.canAfford(amount)
    ) {
      return false;
    }

    this.balance -= amount;

    this.notifyListeners();

    return true;
  }

  // ====================================================
  // ADD MONEY
  //
  // Useful later for rewards, selling hardware,
  // missions, etc.
  // ====================================================

  public addBalance(
    amount: number
  ) {
    if (
      amount <= 0
    ) {
      return;
    }

    this.balance += amount;

    this.notifyListeners();
  }

  // ====================================================
  // MINING HARDWARE
  // ====================================================

  public addMiningPower(
    hashRate: number,
    powerUsage: number
  ) {
    this.totalHashrate +=
      Math.max(
        hashRate,
        0
      );

    this.totalPowerUsage +=
      Math.max(
        powerUsage,
        0
      );

    this.notifyListeners();
  }

  public removeMiningPower(
    hashRate: number,
    powerUsage: number
  ) {
    this.totalHashrate =
      Math.max(
        0,
        this.totalHashrate -
          hashRate
      );

    this.totalPowerUsage =
      Math.max(
        0,
        this.totalPowerUsage -
          powerUsage
      );

    this.notifyListeners();
  }

  // ====================================================
  // ELECTRICITY
  // ====================================================

  public setElectricityPrice(
    pricePerKWh: number
  ) {
    this.electricityPricePerKWh =
      Math.max(
        0,
        pricePerKWh
      );

    this.notifyListeners();
  }

  // ====================================================
  // CALCULATED VALUES
  // ====================================================

  public getRevenuePerSecond():
    number {
    return (
      this.totalHashrate *
      this.revenuePerMHPerSecond
    );
  }

  public getElectricityCostPerSecond():
    number {
    const powerKW =
      this.totalPowerUsage /
      1000;

    return (
      powerKW *
      this.electricityPricePerKWh /
      3600
    );
  }

  public getProfitPerSecond():
    number {
    return (
      this.getRevenuePerSecond() -
      this.getElectricityCostPerSecond()
    );
  }

  // ====================================================
  // GETTERS
  // ====================================================

  public getBalance():
    number {
    return this.balance;
  }

  public getHashrate():
    number {
    return this.totalHashrate;
  }

  public getPowerUsage():
    number {
    return this.totalPowerUsage;
  }

  public getElectricityPrice():
    number {
    return this.electricityPricePerKWh;
  }

  public getTotalRevenue():
    number {
    return this.totalRevenue;
  }

  public getTotalElectricityCost():
    number {
    return this.totalElectricityCost;
  }

  public getTotalProfit():
    number {
    return this.totalProfit;
  }

  // ====================================================
  // EVENTS
  // ====================================================

  public subscribe(
    listener: GameStateListener
  ) {
    this.listeners.push(
      listener
    );

    // Immediately send current state.
    listener(this);

    return () => {
      this.listeners =
        this.listeners.filter(
          (item) =>
            item !== listener
        );
    };
  }

  private notifyListeners() {
    for (
      const listener
      of this.listeners
    ) {
      listener(this);
    }
  }
}
