export interface RawJobEnvelope {
  readonly id: string;
  readonly sourceId: string;
  readonly source: string;
  readonly sourceIndex: number;
  readonly payload: unknown;
}
