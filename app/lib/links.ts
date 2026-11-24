/**
 * Where merchants go for help. The admin opens these public pages in a new tab,
 * and the App Store listing points at the same addresses.
 */
export const SITE_URL = "https://chaserpilot.onrender.com";

export const HELP_LINKS = {
  docs: `${SITE_URL}/docs`,
  support: `${SITE_URL}/support`,
} as const;
