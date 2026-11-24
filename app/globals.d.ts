declare module "*.css";

/**
 * App Home web components that App Bridge defines but `@shopify/polaris-types`
 * does not declare.
 *
 * `s-app-nav` belongs to the App Home surface rather than the Polaris component
 * set, so its types ship separately and are not present in polaris-types 1.0.x.
 * Declaring it here keeps `strict` on for the rest of the file instead of forcing
 * the whole shell to opt out of type checking.
 *
 * Reference: https://shopify.dev/docs/api/app-home-ui-extension/2026-07/web-components/navigation/app-nav
 */
declare namespace JSX {
  interface IntrinsicElements {
    "s-app-nav": {
      id?: string;
      children?: React.ReactNode;
    };
  }
}
