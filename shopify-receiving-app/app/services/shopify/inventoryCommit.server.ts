import { assertNoUserErrors, type AdminGraphqlClient } from "./types";

export interface ReceivingChange {
  inventoryItemId: string;
  delta: number;
}

const ADJUST_QUANTITIES_MUTATION = `#graphql
  mutation CommitReceiving($input: InventoryAdjustQuantitiesInput!) {
    inventoryAdjustQuantities(input: $input) {
      inventoryAdjustmentGroup {
        id
        createdAt
        reason
        changes {
          name
          delta
          quantityAfterChange
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Commit a receiving session: apply all scanned quantity deltas to the
 * `available` quantity at one location in a single atomic adjustment group.
 * `referenceDocumentUri` ties the adjustment back to the receiving session so
 * it shows up in Shopify's inventory history with a traceable reason.
 */
export async function commitReceiving(
  admin: AdminGraphqlClient,
  args: {
    locationId: string;
    changes: ReceivingChange[];
    referenceDocumentUri?: string;
  },
): Promise<{ adjustmentGroupId: string | null }> {
  if (args.changes.length === 0) {
    return { adjustmentGroupId: null };
  }

  const response = await admin.graphql(ADJUST_QUANTITIES_MUTATION, {
    variables: {
      input: {
        reason: "received",
        name: "available",
        referenceDocumentUri:
          args.referenceDocumentUri ?? "app://inventory-receiving/session",
        changes: args.changes.map((change) => ({
          inventoryItemId: change.inventoryItemId,
          locationId: args.locationId,
          delta: change.delta,
        })),
      },
    },
  });
  const json = await response.json();
  const result = json.data?.inventoryAdjustQuantities;

  assertNoUserErrors("inventoryAdjustQuantities", result?.userErrors);

  return {
    adjustmentGroupId: result?.inventoryAdjustmentGroup?.id ?? null,
  };
}
