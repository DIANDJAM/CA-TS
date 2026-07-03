import type { AdminGraphqlClient } from "./types";

export interface VariantMatch {
  variantId: string;
  productId: string;
  inventoryItemId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  barcode: string | null;
  /** Current selling price as a decimal string, e.g. "12.99". */
  price: string;
  /** Cost per item as a decimal string; null when the merchant hasn't set it. */
  unitCost: string | null;
  currencyCode: string | null;
  imageUrl: string | null;
  inventoryTracked: boolean;
  /** Total available across all locations (informational). */
  inventoryQuantity: number | null;
}

const VARIANTS_BY_BARCODE_QUERY = `#graphql
  query VariantsByBarcode($query: String!) {
    productVariants(first: 10, query: $query) {
      nodes {
        id
        title
        sku
        barcode
        price
        inventoryQuantity
        product {
          id
          title
          featuredMedia {
            preview {
              image {
                url(transform: { maxWidth: 120, maxHeight: 120 })
              }
            }
          }
        }
        inventoryItem {
          id
          tracked
          unitCost {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

/**
 * Look up product variants by barcode (UPC/EAN). Shopify stores the barcode on
 * the variant, so a scan resolves to zero, one, or (rarely, if the merchant
 * reused a barcode) multiple variants — the caller decides how to disambiguate.
 */
export async function findVariantsByBarcode(
  admin: AdminGraphqlClient,
  barcode: string,
): Promise<VariantMatch[]> {
  const sanitized = barcode.trim();
  if (!sanitized) return [];

  const response = await admin.graphql(VARIANTS_BY_BARCODE_QUERY, {
    variables: { query: `barcode:${JSON.stringify(sanitized)}` },
  });
  const json = await response.json();
  const nodes: any[] = json.data?.productVariants?.nodes ?? [];

  return nodes
    .filter((node) => node.barcode === sanitized)
    .map((node) => ({
      variantId: node.id,
      productId: node.product.id,
      inventoryItemId: node.inventoryItem.id,
      productTitle: node.product.title,
      variantTitle: node.title === "Default Title" ? null : node.title,
      sku: node.sku ?? null,
      barcode: node.barcode ?? null,
      price: node.price,
      unitCost: node.inventoryItem.unitCost?.amount ?? null,
      currencyCode: node.inventoryItem.unitCost?.currencyCode ?? null,
      imageUrl: node.product.featuredMedia?.preview?.image?.url ?? null,
      inventoryTracked: Boolean(node.inventoryItem.tracked),
      inventoryQuantity:
        typeof node.inventoryQuantity === "number"
          ? node.inventoryQuantity
          : null,
    }));
}
