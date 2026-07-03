import db from "../db.server";
import type { VariantMatch } from "./shopify/variantLookup.server";

/**
 * Persistence for receiving sessions. Lines are keyed by variant within a
 * session: re-scanning the same barcode increments the quantity instead of
 * adding a duplicate row.
 */

export function listSessions(shop: string) {
  return db.receivingSession.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lines: true } } },
    take: 50,
  });
}

export function getSession(shop: string, id: string) {
  return db.receivingSession.findFirst({
    where: { id, shop },
    include: { lines: { orderBy: { updatedAt: "desc" } } },
  });
}

export function createSession(shop: string, name: string) {
  return db.receivingSession.create({
    data: { shop, name },
  });
}

/** Add a scanned variant to the session, or bump quantity if already present. */
export async function addScan(
  sessionId: string,
  barcode: string,
  match: VariantMatch,
) {
  const existing = await db.receivingLine.findUnique({
    where: { sessionId_variantId: { sessionId, variantId: match.variantId } },
  });

  if (existing) {
    return db.receivingLine.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + 1 },
    });
  }

  return db.receivingLine.create({
    data: {
      sessionId,
      barcode,
      variantId: match.variantId,
      productId: match.productId,
      inventoryItemId: match.inventoryItemId,
      productTitle: match.productTitle,
      variantTitle: match.variantTitle,
      sku: match.sku,
      unitCost: match.unitCost,
      originalPrice: match.price,
      currentPrice: match.price,
    },
  });
}

export function setLineQuantity(lineId: string, quantity: number) {
  if (quantity <= 0) {
    return db.receivingLine.delete({ where: { id: lineId } });
  }
  return db.receivingLine.update({
    where: { id: lineId },
    data: { quantity },
  });
}

export function setLinePrice(lineId: string, price: string) {
  return db.receivingLine.update({
    where: { id: lineId },
    data: { currentPrice: price },
  });
}

export function removeLine(lineId: string) {
  return db.receivingLine.delete({ where: { id: lineId } });
}

export function markCommitted(sessionId: string, locationId: string) {
  return db.receivingSession.update({
    where: { id: sessionId },
    data: { status: "committed", committedAt: new Date(), locationId },
  });
}
