/** Everything needed to render a price/barcode label. */
export interface LabelData {
  barcode: string;
  productTitle: string;
  variantTitle?: string | null;
  sku?: string | null;
  /** Decimal string, e.g. "12.99". */
  price: string;
  currencyCode?: string | null;
}

export interface PrintRequest {
  label: LabelData;
  copies: number;
}

export interface PrintResult {
  ok: boolean;
  adapter: string;
  /** Job id from the print backend when available. */
  jobId?: string | null;
  error?: string;
}

/**
 * A pluggable print backend. Implementations:
 *  - PrintNodeAdapter (server-side, cloud print — implemented)
 *  - Zebra Browser Print / Dymo Connect (client-side local agents — the route
 *    returns the rendered label payload and the browser hands it to the agent)
 */
export interface PrintAdapter {
  readonly name: string;
  isConfigured(): boolean;
  print(requests: PrintRequest[]): Promise<PrintResult>;
}
