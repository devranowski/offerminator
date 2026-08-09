export interface RawJobEnvelope {
  readonly id: string;
  readonly source: string;
  readonly sourceIndex: number;
  readonly payload: unknown;
}
