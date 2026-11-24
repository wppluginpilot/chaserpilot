/**
 * Small shared pieces of admin UI. Everything is Polaris web components, so the
 * app looks and behaves like the rest of the Shopify admin.
 */
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";


type Result = { ok: boolean; error?: string; message?: string } | undefined | null;

/** Shows a toast when an action succeeds with a message. */
export function useActionToast(result: Result) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (result?.ok && result.message) shopify.toast.show(result.message);
  }, [result, shopify]);
}

/** Inline error banner for a failed action. */
export function ActionError({ result }: { result: Result }) {
  if (!result || result.ok || !result.error) return null;
  return (
    <s-banner tone="critical" heading="That didn't work">
      <s-paragraph>{result.error}</s-paragraph>
    </s-banner>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <s-stack direction="inline" gap="small" alignItems="center" justifyContent="center" paddingBlockStart="base">
      <s-button disabled={page <= 1} href={page > 1 ? hrefFor(page - 1) : undefined} icon="chevron-left" accessibilityLabel="Previous page" />
      <s-text color="subdued">
        Page {page} of {pageCount}
      </s-text>
      <s-button
        disabled={page >= pageCount}
        href={page < pageCount ? hrefFor(page + 1) : undefined}
        icon="chevron-right"
        accessibilityLabel="Next page"
      />
    </s-stack>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <s-stack direction="block" gap="small-200">
      <s-text color="subdued">{label}</s-text>
      <s-heading>{value}</s-heading>
      {hint ? <s-text color="subdued" fontSize="small">{hint}</s-text> : null}
    </s-stack>
  );
  return href ? (
    <s-clickable href={href} border="base" borderRadius="base" padding="base" background="base">
      {body}
    </s-clickable>
  ) : (
    <s-box border="base" borderRadius="base" padding="base" background="base">
      {body}
    </s-box>
  );
}

/**
 * Downloads a file from an authenticated admin route. A plain link would open
 * outside the admin iframe with no session token; App Bridge adds the token to
 * same-origin fetches, so fetch the file and hand the browser a blob.
 */
export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(path);
  if (!response.ok) {
    window.shopify?.toast.show("Export failed. Please try again.", { isError: true });
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A plain list with a header row, laid out on a grid. Used instead of <s-table>
 * wherever rows carry actions: clicks on controls inside s-table cells never
 * reach them in the embedded admin.
 */
export function RowList({ columns, headers, children }: { columns: string; headers: string[]; children: React.ReactNode }) {
  return (
    <s-stack direction="block">
      <s-box paddingInline="base" paddingBlock="small" background="subdued">
        <s-grid gridTemplateColumns={columns} gap="base" alignItems="center">
          {headers.map((h, i) => (
            <s-text key={i} color="subdued" type="strong">
              {h}
            </s-text>
          ))}
        </s-grid>
      </s-box>
      {children}
    </s-stack>
  );
}

export function Row({ columns, children }: { columns: string; children: React.ReactNode }) {
  return (
    <>
      <s-divider />
      <s-box paddingInline="base" paddingBlock="small">
        <s-grid gridTemplateColumns={columns} gap="base" alignItems="center">
          {children}
        </s-grid>
      </s-box>
    </>
  );
}
