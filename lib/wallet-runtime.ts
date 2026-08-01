export type WalletRuntimeFactoryContext = {
  isCurrent: () => boolean;
};

const retiredWalletMessage =
  "The wallet connection changed while the request was in progress. Try again.";

export class WalletRuntime<Wallet> {
  private readonly createWallet: (
    context: WalletRuntimeFactoryContext,
  ) => Promise<Wallet>;
  private readonly disposeWallet: (wallet: Wallet) => Promise<void>;
  private generation = 0;
  private wallet: Wallet | null = null;
  private creation:
    | {
        generation: number;
        promise: Promise<Wallet>;
      }
    | undefined;
  private transition = Promise.resolve();
  private connectFlight: Promise<void> | undefined;

  constructor(
    createWallet: (context: WalletRuntimeFactoryContext) => Promise<Wallet>,
    disposeWallet: (wallet: Wallet) => Promise<void>,
  ) {
    this.createWallet = createWallet;
    this.disposeWallet = disposeWallet;
  }

  get currentGeneration() {
    return this.generation;
  }

  isCurrent(wallet: Wallet, generation: number) {
    return this.wallet === wallet && this.generation === generation;
  }

  async get() {
    if (this.wallet) return this.wallet;
    if (this.creation?.generation === this.generation) {
      return this.creation.promise;
    }

    const generation = this.generation;
    const promise = this.createWallet({
      isCurrent: () => this.generation === generation,
    }).then(async (wallet) => {
      if (this.generation !== generation) {
        await this.disposeWallet(wallet).catch(() => undefined);
        throw new Error(retiredWalletMessage);
      }
      this.wallet = wallet;
      return wallet;
    });
    this.creation = { generation, promise };
    void promise
      .finally(() => {
        if (this.creation?.promise === promise) {
          this.creation = undefined;
        }
      })
      .catch(() => undefined);
    return promise;
  }

  connect(action: (wallet: Wallet, generation: number) => Promise<void>) {
    if (this.connectFlight) return this.connectFlight;

    const requestedGeneration = this.generation;
    const acquisition = this.get();
    const flight = this.enqueue(async () => {
      const wallet = await acquisition;
      this.assertCurrent(wallet, requestedGeneration);
      await action(wallet, requestedGeneration);
      this.assertCurrent(wallet, requestedGeneration);
    });
    this.connectFlight = flight;
    void flight
      .finally(() => {
        if (this.connectFlight === flight) {
          this.connectFlight = undefined;
        }
      })
      .catch(() => undefined);
    return flight;
  }

  disconnect() {
    this.generation += 1;
    this.connectFlight = undefined;
    const wallet = this.wallet;
    this.wallet = null;
    const creation = this.creation?.promise;

    return this.enqueue(async () => {
      if (wallet) {
        await this.disposeWallet(wallet);
      } else if (creation) {
        await creation.catch(() => undefined);
      }
    });
  }

  private assertCurrent(wallet: Wallet, generation: number) {
    if (!this.isCurrent(wallet, generation)) {
      throw new Error(retiredWalletMessage);
    }
  }

  private enqueue(action: () => Promise<void>) {
    const result = this.transition.then(action, action);
    this.transition = result.catch(() => undefined);
    return result;
  }
}
