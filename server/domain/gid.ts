export type SubjectKind = "ORDER" | "CUSTOMER";

const GID = /^gid:\/\/shopify\/(Order|Customer)\/(\d+)$/;

export function parseGid(gid: string): { kind: SubjectKind; id: string } | null {
  const m = GID.exec(gid);
  if (!m) return null;
  return { kind: m[1] === "Order" ? "ORDER" : "CUSTOMER", id: m[2]! };
}

export function makeGid(kind: SubjectKind, id: string | number): string {
  return `gid://shopify/${kind === "ORDER" ? "Order" : "Customer"}/${id}`;
}

/** https://admin.shopify.com/store/<store>/orders/<id> or /customers/<id>. */
export function adminUrl(shopDomain: string, gid: string): string | null {
  const parsed = parseGid(gid);
  if (!parsed) return null;
  const store = shopDomain.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${store}/${parsed.kind === "ORDER" ? "orders" : "customers"}/${parsed.id}`;
}
