/**
 * app/uninstalled. The access token is already revoked, so nothing here may
 * call the Admin API. Sessions are deleted and running jobs cancelled; setup
 * data stays until shop/redact (48 h later) so a quick reinstall finds it.
 */
import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";
import { log } from "../../server/logger.server";
import { markUninstalled } from "../../server/services/shop.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  await markUninstalled(prisma, shop);
  log().info({ shop, topic }, "webhook processed");
  return new Response();
};
