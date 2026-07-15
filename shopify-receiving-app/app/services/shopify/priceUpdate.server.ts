import { assertNoUserErrors, type AdminGraphqlClient } from "./types";

const UPDATE_VARIANT_PRICE_MUTATION = `#graphql
  mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Update a single variant's price (the margin-adjustment step of the receiving
 * flow). Uses productVariantsBulkUpdate, which is the current canonical way to
 * change variant prices via the Admin GraphQL API.
 */
export async function updateVariantPrice(
  admin: AdminGraphqlClient,
  args: { productId: string; variantId: string; price: string },
): Promise<{ variantId: string; price: string }> {
  const response = await admin.graphql(UPDATE_VARIANT_PRICE_MUTATION, {
    variables: {
      productId: args.productId,
      variants: [{ id: args.variantId, price: args.price }],
    },
  });
  const json = (await response.json()) as any;
  const result = json.data?.productVariantsBulkUpdate;

  assertNoUserErrors("productVariantsBulkUpdate", result?.userErrors);

  const updated = result?.productVariants?.[0];
  return { variantId: updated?.id ?? args.variantId, price: updated?.price ?? args.price };
}
