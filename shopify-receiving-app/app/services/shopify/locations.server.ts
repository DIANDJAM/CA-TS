import type { AdminGraphqlClient } from "./types";

export interface ShopLocation {
  id: string;
  name: string;
  isActive: boolean;
}

const LOCATIONS_QUERY = `#graphql
  query ReceivingLocations {
    locations(first: 50, query: "active:true") {
      nodes {
        id
        name
        isActive
      }
    }
  }
`;

/** Active locations the merchant can receive inventory into. */
export async function listLocations(
  admin: AdminGraphqlClient,
): Promise<ShopLocation[]> {
  const response = await admin.graphql(LOCATIONS_QUERY);
  const json = (await response.json()) as any;
  const nodes: any[] = json.data?.locations?.nodes ?? [];
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    isActive: Boolean(node.isActive),
  }));
}
