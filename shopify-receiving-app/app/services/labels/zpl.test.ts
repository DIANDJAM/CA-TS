import { describe, expect, it } from "vitest";
import { buildZplBatch, buildZplLabel } from "./zpl";

const baseLabel = {
  barcode: "012345678905",
  productTitle: "Cabernet Sauvignon 750ml",
  price: "18.99",
};

describe("buildZplLabel", () => {
  it("wraps output in ^XA/^XZ", () => {
    const zpl = buildZplLabel(baseLabel);
    expect(zpl.startsWith("^XA")).toBe(true);
    expect(zpl.endsWith("^XZ")).toBe(true);
  });

  it("uses UPC-A symbology for 12-digit barcodes (11 data digits)", () => {
    const zpl = buildZplLabel(baseLabel);
    expect(zpl).toContain("^BU");
    expect(zpl).toContain("^FD01234567890^FS"); // check digit stripped
  });

  it("uses EAN-13 symbology for 13-digit barcodes", () => {
    const zpl = buildZplLabel({ ...baseLabel, barcode: "4006381333931" });
    expect(zpl).toContain("^BE");
  });

  it("falls back to Code 128 for non-numeric barcodes", () => {
    const zpl = buildZplLabel({ ...baseLabel, barcode: "ABC-123" });
    expect(zpl).toContain("^BC");
    expect(zpl).toContain("ABC-123");
  });

  it("includes the price", () => {
    expect(buildZplLabel(baseLabel)).toContain("$18.99");
  });

  it("strips ZPL control characters from titles", () => {
    const zpl = buildZplLabel({
      ...baseLabel,
      productTitle: "Weird^Title~With\\Controls",
    });
    expect(zpl).not.toContain("Weird^Title");
  });
});

describe("buildZplBatch", () => {
  it("repeats labels per copies", () => {
    const zpl = buildZplBatch([{ label: baseLabel, copies: 3 }]);
    expect(zpl.match(/\^XA/g)).toHaveLength(3);
  });

  it("treats copies < 1 as 1", () => {
    const zpl = buildZplBatch([{ label: baseLabel, copies: 0 }]);
    expect(zpl.match(/\^XA/g)).toHaveLength(1);
  });
});
