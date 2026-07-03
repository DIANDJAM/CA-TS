import type { PrintAdapter, PrintRequest, PrintResult } from "./types";
import { PrintNodeAdapter } from "./printNode.server";
import { buildZplBatch } from "./zpl";

export type { LabelData, PrintRequest, PrintResult } from "./types";

/**
 * Print via the first configured adapter. When nothing is configured the
 * result carries the raw ZPL so the UI can fall back to a client-side path
 * (Zebra Browser Print / Dymo Connect) or show the payload for debugging.
 */
export async function printLabels(
  requests: PrintRequest[],
): Promise<PrintResult & { zpl: string }> {
  const zpl = buildZplBatch(requests);
  const adapters: PrintAdapter[] = [new PrintNodeAdapter()];
  const adapter = adapters.find((candidate) => candidate.isConfigured());

  if (!adapter) {
    return {
      ok: false,
      adapter: "none",
      error:
        "No print backend configured. Set PRINTNODE_API_KEY/PRINTNODE_PRINTER_ID, or use the ZPL payload with Zebra Browser Print.",
      zpl,
    };
  }

  const result = await adapter.print(requests);
  return { ...result, zpl };
}
