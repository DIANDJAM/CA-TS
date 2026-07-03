/**
 * Minimal structural type for the authenticated admin GraphQL client returned
 * by `authenticate.admin(request)`. Typed structurally so services stay
 * decoupled from @shopify/shopify-app-remix internals and are easy to mock in
 * tests.
 */
export interface AdminGraphqlClient {
  graphql(
    query: string,
    options?: { variables?: Record<string, unknown> },
  ): Promise<Response>;
}

export interface UserError {
  field?: string[] | string | null;
  message: string;
}

export class ShopifyUserError extends Error {
  constructor(
    public operation: string,
    public userErrors: UserError[],
  ) {
    super(
      `${operation} failed: ${userErrors.map((e) => e.message).join("; ")}`,
    );
    this.name = "ShopifyUserError";
  }
}

export function assertNoUserErrors(
  operation: string,
  userErrors: UserError[] | undefined | null,
): void {
  if (userErrors && userErrors.length > 0) {
    throw new ShopifyUserError(operation, userErrors);
  }
}
