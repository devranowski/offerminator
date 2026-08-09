export type CurrencyConversionResult =
  | {
      readonly ok: true;
      readonly usdCents: number;
    }
  | {
      readonly ok: false;
      readonly reason: 'unsupported-currency';
      readonly currency: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'amount-out-of-range';
      readonly currency: string;
    };
