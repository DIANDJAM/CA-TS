import { useCallback, useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  IndexTable,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  addScan,
  getSession,
  markCommitted,
  removeLine,
  setLinePrice,
  setLineQuantity,
} from "../services/receiving.server";
import {
  findVariantsByBarcode,
  type VariantMatch,
} from "../services/shopify/variantLookup.server";
import { updateVariantPrice } from "../services/shopify/priceUpdate.server";
import { commitReceiving } from "../services/shopify/inventoryCommit.server";
import { listLocations } from "../services/shopify/locations.server";
import { printLabels } from "../services/labels/index.server";
import { ShopifyUserError } from "../services/shopify/types";
import {
  formatMoney,
  marginPercent,
  parseMoney,
  priceForTargetMargin,
} from "../services/margin";

interface LineDto {
  id: string;
  barcode: string;
  variantId: string;
  productId: string;
  inventoryItemId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitCost: string | null;
  originalPrice: string;
  currentPrice: string;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const receivingSession = await getSession(session.shop, params.id!);
  if (!receivingSession) {
    throw new Response("Receiving session not found", { status: 404 });
  }

  const locations =
    receivingSession.status === "open" ? await listLocations(admin) : [];

  return {
    receivingSession: {
      id: receivingSession.id,
      name: receivingSession.name,
      status: receivingSession.status,
      committedAt: receivingSession.committedAt?.toISOString() ?? null,
      lines: receivingSession.lines.map(
        (line): LineDto => ({
          id: line.id,
          barcode: line.barcode,
          variantId: line.variantId,
          productId: line.productId,
          inventoryItemId: line.inventoryItemId,
          productTitle: line.productTitle,
          variantTitle: line.variantTitle,
          sku: line.sku,
          quantity: line.quantity,
          unitCost: line.unitCost?.toString() ?? null,
          originalPrice: line.originalPrice.toString(),
          currentPrice: line.currentPrice.toString(),
        }),
      ),
    },
    locations,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const receivingSession = await getSession(session.shop, params.id!);
  if (!receivingSession) {
    throw new Response("Receiving session not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  try {
    switch (intent) {
      case "scan": {
        const barcode = String(formData.get("barcode") ?? "").trim();
        if (!barcode) return { intent, status: "empty" as const };

        const matches = await findVariantsByBarcode(admin, barcode);
        if (matches.length === 0) {
          return { intent, status: "not_found" as const, barcode };
        }
        if (matches.length > 1) {
          return { intent, status: "multiple" as const, barcode, matches };
        }
        await addScan(receivingSession.id, barcode, matches[0]);
        return {
          intent,
          status: "added" as const,
          productTitle: matches[0].productTitle,
        };
      }
      case "add-match": {
        const match = JSON.parse(
          String(formData.get("match")),
        ) as VariantMatch;
        await addScan(receivingSession.id, match.barcode ?? "", match);
        return {
          intent,
          status: "added" as const,
          productTitle: match.productTitle,
        };
      }
      case "set-qty": {
        await setLineQuantity(
          String(formData.get("lineId")),
          Number(formData.get("quantity")),
        );
        return { intent, status: "ok" as const };
      }
      case "remove-line": {
        await removeLine(String(formData.get("lineId")));
        return { intent, status: "ok" as const };
      }
      case "set-price": {
        const lineId = String(formData.get("lineId"));
        const price = formatMoney(parseMoney(String(formData.get("price")))!);
        // Push the new price to Shopify first, then mirror it locally, so the
        // local table never claims a price Shopify rejected.
        await updateVariantPrice(admin, {
          productId: String(formData.get("productId")),
          variantId: String(formData.get("variantId")),
          price,
        });
        await setLinePrice(lineId, price);
        return { intent, status: "ok" as const, price };
      }
      case "commit": {
        const locationId = String(formData.get("locationId"));
        if (!locationId) {
          return {
            intent,
            status: "error" as const,
            message: "Pick a location to receive into.",
          };
        }
        const fresh = await getSession(session.shop, receivingSession.id);
        await commitReceiving(admin, {
          locationId,
          referenceDocumentUri: `app://inventory-receiving/session/${receivingSession.id}`,
          changes: (fresh?.lines ?? []).map((line) => ({
            inventoryItemId: line.inventoryItemId,
            delta: line.quantity,
          })),
        });
        await markCommitted(receivingSession.id, locationId);
        return { intent, status: "committed" as const };
      }
      case "print": {
        const lineId = formData.get("lineId");
        const fresh = await getSession(session.shop, receivingSession.id);
        const lines = (fresh?.lines ?? []).filter(
          (line) => !lineId || line.id === String(lineId),
        );
        const result = await printLabels(
          lines.map((line) => ({
            label: {
              barcode: line.barcode,
              productTitle: line.productTitle,
              variantTitle: line.variantTitle,
              sku: line.sku,
              price: line.currentPrice.toString(),
            },
            copies: line.quantity,
          })),
        );
        return {
          intent,
          status: result.ok ? ("ok" as const) : ("error" as const),
          message: result.error,
          jobId: result.jobId ?? null,
        };
      }
      default:
        return { intent, status: "error" as const, message: "Unknown action" };
    }
  } catch (error) {
    if (error instanceof ShopifyUserError) {
      return { intent, status: "error" as const, message: error.message };
    }
    throw error;
  }
};

export default function ReceivingSession() {
  const { receivingSession, locations } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const revalidator = useRevalidator();

  const scanFetcher = useFetcher<typeof action>();
  const lineFetcher = useFetcher<typeof action>();
  const commitFetcher = useFetcher<typeof action>();
  const printFetcher = useFetcher<typeof action>();

  const [barcode, setBarcode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [editingLine, setEditingLine] = useState<LineDto | null>(null);
  const focusScanInput = () =>
    document.getElementById("scan-input")?.focus();

  const isOpen = receivingSession.status === "open";
  const scanResult = scanFetcher.data;

  // After every scan settles, clear the box and refocus for the next scan.
  useEffect(() => {
    if (scanFetcher.state === "idle" && scanResult) {
      if (scanResult.status === "added") {
        setBarcode("");
        shopify.toast.show(`Added ${scanResult.productTitle}`);
        revalidator.revalidate();
      }
      focusScanInput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanFetcher.state, scanResult]);

  useEffect(() => {
    if (lineFetcher.state === "idle" && lineFetcher.data) {
      if (lineFetcher.data.status === "error") {
        shopify.toast.show(lineFetcher.data.message ?? "Update failed", {
          isError: true,
        });
      }
      revalidator.revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineFetcher.state, lineFetcher.data]);

  useEffect(() => {
    if (printFetcher.state === "idle" && printFetcher.data) {
      if (printFetcher.data.status === "ok") {
        shopify.toast.show("Labels sent to printer");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printFetcher.state, printFetcher.data]);

  const submitScan = useCallback(() => {
    if (!barcode.trim()) return;
    scanFetcher.submit({ intent: "scan", barcode }, { method: "post" });
  }, [barcode, scanFetcher]);

  const setQuantity = (line: LineDto, quantity: number) => {
    lineFetcher.submit(
      { intent: "set-qty", lineId: line.id, quantity: String(quantity) },
      { method: "post" },
    );
  };

  const totalUnits = receivingSession.lines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  return (
    <Page
      title={receivingSession.name}
      titleMetadata={
        <Badge tone={isOpen ? "attention" : "success"}>
          {receivingSession.status}
        </Badge>
      }
      backAction={{ url: "/app" }}
      subtitle={`${receivingSession.lines.length} products · ${totalUnits} units`}
      secondaryActions={[
        {
          content: "Print all labels",
          disabled: receivingSession.lines.length === 0,
          onAction: () =>
            printFetcher.submit({ intent: "print" }, { method: "post" }),
        },
      ]}
    >
      <BlockStack gap="400">
        {receivingSession.status === "committed" && (
          <Banner tone="success" title="Session committed">
            <p>
              Inventory quantities were applied on{" "}
              {receivingSession.committedAt
                ? new Date(receivingSession.committedAt).toLocaleString()
                : ""}
              . This session is now read-only.
            </p>
          </Banner>
        )}

        {isOpen && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Scan a barcode
              </Text>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitScan();
                }}
              >
                <InlineStack gap="200" blockAlign="end" wrap={false}>
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      label="UPC / EAN"
                      labelHidden
                      placeholder="Scan or type a barcode, then press Enter"
                      value={barcode}
                      onChange={setBarcode}
                      autoComplete="off"
                      autoFocus
                      id="scan-input"
                      loading={scanFetcher.state !== "idle"}
                    />
                  </div>
                  <Button submit={false} onClick={submitScan} variant="primary">
                    Add
                  </Button>
                </InlineStack>
              </form>

              {scanResult?.status === "not_found" && (
                <Banner tone="warning" title="No product found">
                  <p>
                    No variant in this store has barcode{" "}
                    <b>{scanResult.barcode}</b>. Add the barcode to the product
                    in Shopify, then scan again.
                  </p>
                </Banner>
              )}

              {scanResult?.status === "multiple" && (
                <Banner tone="info" title="Multiple products share this barcode">
                  <BlockStack gap="200">
                    {scanResult.matches.map((match) => (
                      <InlineStack key={match.variantId} gap="200">
                        <Button
                          size="slim"
                          onClick={() =>
                            scanFetcher.submit(
                              {
                                intent: "add-match",
                                match: JSON.stringify(match),
                              },
                              { method: "post" },
                            )
                          }
                        >
                          Add
                        </Button>
                        <Text as="span">
                          {match.productTitle}
                          {match.variantTitle ? ` — ${match.variantTitle}` : ""}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        )}

        <Card padding="0">
          <IndexTable
            itemCount={receivingSession.lines.length}
            selectable={false}
            headings={[
              { title: "Product" },
              { title: "Qty" },
              { title: "Cost" },
              { title: "Price" },
              { title: "Margin" },
              { title: "" },
            ]}
            emptyState={
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text as="p" tone="subdued">
                  Scanned products will appear here.
                </Text>
              </div>
            }
          >
            {receivingSession.lines.map((line, index) => {
              const price = parseMoney(line.currentPrice) ?? 0;
              const cost = parseMoney(line.unitCost);
              const margin = marginPercent(price, cost);
              return (
                <IndexTable.Row id={line.id} key={line.id} position={index}>
                  <IndexTable.Cell>
                    <BlockStack gap="050">
                      <Text as="span" fontWeight="semibold">
                        {line.productTitle}
                        {line.variantTitle ? ` — ${line.variantTitle}` : ""}
                      </Text>
                      <Text as="span" tone="subdued" variant="bodySm">
                        {line.barcode}
                        {line.sku ? ` · SKU ${line.sku}` : ""}
                      </Text>
                    </BlockStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {isOpen ? (
                      <ButtonGroup>
                        <Button
                          size="micro"
                          onClick={() => setQuantity(line, line.quantity - 1)}
                        >
                          −
                        </Button>
                        <Text as="span">{line.quantity}</Text>
                        <Button
                          size="micro"
                          onClick={() => setQuantity(line, line.quantity + 1)}
                        >
                          +
                        </Button>
                      </ButtonGroup>
                    ) : (
                      String(line.quantity)
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {cost !== null ? `$${formatMoney(cost)}` : "—"}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {isOpen ? (
                      <Button
                        variant="plain"
                        onClick={() => setEditingLine(line)}
                      >
                        {`$${formatMoney(price)}`}
                      </Button>
                    ) : (
                      `$${formatMoney(price)}`
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {margin === null ? (
                      <Text as="span" tone="subdued">
                        no cost set
                      </Text>
                    ) : (
                      <Badge tone={margin < 0 ? "critical" : "success"}>
                        {`${margin}%`}
                      </Badge>
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <ButtonGroup>
                      <Button
                        size="slim"
                        onClick={() =>
                          printFetcher.submit(
                            { intent: "print", lineId: line.id },
                            { method: "post" },
                          )
                        }
                      >
                        Print
                      </Button>
                      {isOpen && (
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() =>
                            lineFetcher.submit(
                              { intent: "remove-line", lineId: line.id },
                              { method: "post" },
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </ButtonGroup>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        </Card>

        {printFetcher.data?.status === "error" && (
          <Banner tone="warning" title="Printing not available">
            <p>{printFetcher.data.message}</p>
          </Banner>
        )}

        {isOpen && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Commit to inventory
              </Text>
              <Text as="p" tone="subdued">
                Applies every quantity in this session to the selected
                location's available inventory as a single "received"
                adjustment, then locks the session.
              </Text>
              <InlineStack gap="200" blockAlign="end">
                <Select
                  label="Receive into location"
                  options={[
                    { label: "Select a location", value: "" },
                    ...locations.map((location) => ({
                      label: location.name,
                      value: location.id,
                    })),
                  ]}
                  value={locationId}
                  onChange={setLocationId}
                />
                <Button
                  variant="primary"
                  disabled={
                    !locationId ||
                    receivingSession.lines.length === 0 ||
                    commitFetcher.state !== "idle"
                  }
                  loading={commitFetcher.state !== "idle"}
                  onClick={() =>
                    commitFetcher.submit(
                      { intent: "commit", locationId },
                      { method: "post" },
                    )
                  }
                >
                  {`Commit ${totalUnits} units`}
                </Button>
              </InlineStack>
              {commitFetcher.data?.status === "error" && (
                <Banner tone="critical" title="Commit failed">
                  <p>{commitFetcher.data.message}</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        )}
      </BlockStack>

      {editingLine && (
        <PriceEditorModal
          line={editingLine}
          onClose={() => setEditingLine(null)}
          fetcher={lineFetcher}
        />
      )}
    </Page>
  );
}

function PriceEditorModal({
  line,
  onClose,
  fetcher,
}: {
  line: LineDto;
  onClose: () => void;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
}) {
  const [price, setPrice] = useState(line.currentPrice);
  const [targetMargin, setTargetMargin] = useState("");
  const cost = parseMoney(line.unitCost);
  const previewMargin = marginPercent(parseMoney(price) ?? 0, cost);
  const submitting = fetcher.state !== "idle";

  // Close once the save round-trip finishes.
  useEffect(() => {
    if (!submitting && fetcher.data?.intent === "set-price") {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, fetcher.data]);

  const applyTargetMargin = () => {
    const target = Number(targetMargin);
    if (cost === null || !isFinite(target)) return;
    const computed = priceForTargetMargin(cost, target);
    if (computed !== null) setPrice(formatMoney(computed));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust price — ${line.productTitle}`}
      primaryAction={{
        content: "Save to Shopify",
        loading: submitting,
        onAction: () =>
          fetcher.submit(
            {
              intent: "set-price",
              lineId: line.id,
              productId: line.productId,
              variantId: line.variantId,
              price,
            },
            { method: "post" },
          ),
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <InlineStack gap="600">
            <Text as="p">
              Cost: <b>{cost !== null ? `$${formatMoney(cost)}` : "not set"}</b>
            </Text>
            <Text as="p">
              Current price: <b>${line.currentPrice}</b>
            </Text>
            <Text as="p">
              New margin:{" "}
              <b>{previewMargin !== null ? `${previewMargin}%` : "—"}</b>
            </Text>
          </InlineStack>

          {cost !== null && (
            <InlineStack gap="200" blockAlign="end">
              <TextField
                label="Target margin %"
                type="number"
                value={targetMargin}
                onChange={setTargetMargin}
                autoComplete="off"
                helpText="Computes the price needed to hit this gross margin."
              />
              <Button onClick={applyTargetMargin}>Compute price</Button>
            </InlineStack>
          )}

          <TextField
            label="New price"
            type="number"
            prefix="$"
            value={price}
            onChange={setPrice}
            autoComplete="off"
          />

          <Text as="p" tone="subdued">
            Saving updates the variant price in Shopify immediately and is
            reflected on printed labels.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
