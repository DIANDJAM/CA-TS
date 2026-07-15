import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link as RemixLink, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { getShopify } from "../shopify.server";
import { listSessions } from "../services/receiving.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { session } = await getShopify(context).authenticate.admin(request);
  const sessions = await listSessions(session.shop);

  return {
    sessions: sessions.map((receivingSession) => ({
      id: receivingSession.id,
      name: receivingSession.name,
      status: receivingSession.status,
      lineCount: receivingSession._count.lines,
      unmatchedCount: receivingSession._count.unmatched,
      createdAt: receivingSession.createdAt.toISOString(),
    })),
  };
};

export default function Dashboard() {
  const { sessions } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Inventory receiving"
      primaryAction={{
        content: "New receiving session",
        url: "/app/receiving/new",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {sessions.length === 0 ? (
              <EmptyState
                heading="Receive your first shipment"
                action={{
                  content: "New receiving session",
                  url: "/app/receiving/new",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Start a session, scan product barcodes as you unpack, adjust
                  pricing to hit your margin, then commit all quantities to
                  inventory in one step.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                itemCount={sessions.length}
                selectable={false}
                headings={[
                  { title: "Session" },
                  { title: "Status" },
                  { title: "Products" },
                  { title: "Unmatched" },
                  { title: "Created" },
                ]}
              >
                {sessions.map((receivingSession, index) => (
                  <IndexTable.Row
                    id={receivingSession.id}
                    key={receivingSession.id}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <RemixLink to={`/app/receiving/${receivingSession.id}`}>
                        <Text as="span" fontWeight="semibold">
                          {receivingSession.name}
                        </Text>
                      </RemixLink>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge
                        tone={
                          receivingSession.status === "committed"
                            ? "success"
                            : "attention"
                        }
                      >
                        {receivingSession.status}
                      </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{receivingSession.lineCount}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {receivingSession.unmatchedCount > 0 ? (
                        <Badge tone="warning">
                          {String(receivingSession.unmatchedCount)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {new Date(receivingSession.createdAt).toLocaleString()}
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Text as="p" tone="subdued">
              Tip: any USB or Bluetooth barcode scanner that types like a
              keyboard works — open a session, click into the scan box, and
              start scanning.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
