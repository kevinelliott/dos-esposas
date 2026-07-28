export const actionDelay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const interfaceTimings = {
  forgeCharge: 420,
  forgeCool: 620,
  marketPack: 320,
  marketDispatch: 540,
  tradeWrite: 360,
  tradeHandoff: 340,
  tradeSeal: 520,
  replateTicket: 480,
  replateServe: 680,
  claimStamp: 360,
  claimDispense: 640,
} as const;
