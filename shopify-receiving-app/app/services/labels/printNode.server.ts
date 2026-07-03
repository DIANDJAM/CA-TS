import type { PrintAdapter, PrintRequest, PrintResult } from "./types";
import { buildZplBatch } from "./zpl";

/**
 * PrintNode cloud-print adapter. PrintNode runs a small client on any machine
 * with the label printer attached and exposes it via REST — the simplest way
 * to print server-side without browser plugins.
 *
 * Configure with:
 *   PRINTNODE_API_KEY    - from https://app.printnode.com
 *   PRINTNODE_PRINTER_ID - numeric id from GET /printers
 */
export class PrintNodeAdapter implements PrintAdapter {
  readonly name = "printnode";

  constructor(
    private apiKey = process.env.PRINTNODE_API_KEY,
    private printerId = process.env.PRINTNODE_PRINTER_ID,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.printerId);
  }

  async print(requests: PrintRequest[]): Promise<PrintResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        adapter: this.name,
        error:
          "PrintNode is not configured (set PRINTNODE_API_KEY and PRINTNODE_PRINTER_ID).",
      };
    }

    const zpl = buildZplBatch(requests);
    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: Number(this.printerId),
        title: "Receiving labels",
        contentType: "raw_base64",
        content: Buffer.from(zpl, "utf8").toString("base64"),
        source: "inventory-receiving-app",
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        adapter: this.name,
        error: `PrintNode API error ${response.status}: ${await response.text()}`,
      };
    }

    return { ok: true, adapter: this.name, jobId: String(await response.json()) };
  }
}
