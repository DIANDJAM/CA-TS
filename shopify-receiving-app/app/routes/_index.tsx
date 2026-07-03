import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Inventory Receiving</h1>
      <p>
        Scan UPCs, review margin, adjust pricing, print labels, and commit
        received quantities to Shopify inventory in one batch.
      </p>
      {showForm && (
        <Form method="post" action="/auth/login">
          <label>
            Shop domain
            <input
              type="text"
              name="shop"
              placeholder="my-shop-domain.myshopify.com"
              style={{ margin: "0 0.5rem" }}
            />
          </label>
          <button type="submit">Log in</button>
        </Form>
      )}
    </main>
  );
}
