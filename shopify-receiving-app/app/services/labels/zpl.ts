import type { LabelData } from "./types";

/**
 * Render a LabelData as ZPL for a 2.25" x 1.25" thermal label at 203 dpi
 * (Zebra LP2824/ZD410-class printers — the common retail price-label stock).
 * ZPL is plain text, so this needs no dependencies and works with both
 * PrintNode (raw job) and Zebra Browser Print.
 */

const DOTS_PER_INCH = 203;
const LABEL_WIDTH = Math.round(2.25 * DOTS_PER_INCH); // 456 dots
const LABEL_HEIGHT = Math.round(1.25 * DOTS_PER_INCH); // 253 dots

/** ZPL field data must not contain control characters or the ^ ~ commands. */
function sanitize(text: string): string {
  return text.replace(/[\^~\\]/g, " ").replace(/[\r\n]+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** UPC-A (12 digits) and EAN-13 get dedicated symbologies; anything else falls back to Code 128. */
function barcodeCommand(barcode: string): string {
  const digitsOnly = /^\d+$/.test(barcode);
  if (digitsOnly && barcode.length === 12) {
    // ^BU = UPC-A. ZPL expects the 11 data digits; the printer computes the check digit.
    return `^BUN,60,Y,N,Y^FD${barcode.slice(0, 11)}^FS`;
  }
  if (digitsOnly && barcode.length === 13) {
    // ^BE = EAN-13. Expects 12 data digits.
    return `^BEN,60,Y,N^FD${barcode.slice(0, 12)}^FS`;
  }
  return `^BCN,60,Y,N,N^FD${sanitize(barcode)}^FS`;
}

export function buildZplLabel(label: LabelData): string {
  const title = truncate(
    sanitize(
      [label.productTitle, label.variantTitle].filter(Boolean).join(" - "),
    ),
    38,
  );
  const price = `$${label.price}`;

  return [
    "^XA",
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    "^LH0,0",
    // Title, small font, top of label
    `^FO16,12^A0N,22,22^FB${LABEL_WIDTH - 32},1,0,L^FD${title}^FS`,
    // Barcode, centered block
    `^FO40,44${barcodeCommand(label.barcode)}`,
    // Price, large, bottom-right
    `^FO16,${LABEL_HEIGHT - 60}^A0N,44,44^FB${LABEL_WIDTH - 32},1,0,R^FD${sanitize(price)}^FS`,
    "^XZ",
  ].join("\n");
}

export function buildZplBatch(
  labels: { label: LabelData; copies: number }[],
): string {
  return labels
    .flatMap(({ label, copies }) =>
      Array.from({ length: Math.max(1, copies) }, () => buildZplLabel(label)),
    )
    .join("\n");
}
