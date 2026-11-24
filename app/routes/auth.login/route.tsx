/**
 * Shop-domain entry page.
 *
 * This renders OUTSIDE the Shopify admin, which is why it uses plain semantic
 * HTML rather than Polaris web components: the `s-*` custom elements are defined
 * by App Bridge, which is only present inside the admin frame. As of
 * @shopify/shopify-app-react-router v2, `AppProvider` always mounts App Bridge and
 * requires an API key, so wrapping this page in it would be wrong on both counts.
 */
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const meta: MetaFunction = () => [{ title: "Log in · ChaserPilot" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return { errors: loginErrorMessage(await login(request)) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return { errors: loginErrorMessage(await login(request)) };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [shop, setShop] = useState("");

  const { errors } = actionData ?? loaderData;
  const isSubmitting = navigation.state === "submitting";
  const errorId = errors.shop ? "shop-error" : undefined;

  return (
    <main className="login">
      <div className="login__card">
        <h1 className="login__title">
          <picture>
            <source srcSet="/brand/logo-on-dark.svg" media="(prefers-color-scheme: dark)" />
            <img src="/brand/logo.svg" alt="ChaserPilot" width="144" height="40" />
          </picture>
        </h1>
        <p className="login__subtitle">
          Never forget what you promised a customer.
        </p>

        <Form method="post" className="login__form">
          <label className="login__label" htmlFor="shop">
            Shop domain
          </label>
          <input
            id="shop"
            name="shop"
            className="login__input"
            value={shop}
            onChange={(event) => setShop(event.currentTarget.value)}
            placeholder="example.myshopify.com"
            autoComplete="on"
            autoCapitalize="off"
            spellCheck={false}
            required
            aria-describedby={errorId ?? "shop-hint"}
            aria-invalid={errors.shop ? true : undefined}
          />
          {errors.shop ? (
            <p id="shop-error" className="login__error" role="alert">
              {errors.shop}
            </p>
          ) : (
            <p id="shop-hint" className="login__hint">
              Enter the myshopify.com domain of the store you want to open.
            </p>
          )}

          <button type="submit" className="login__button" disabled={isSubmitting}>
            {isSubmitting ? "Opening…" : "Log in"}
          </button>
        </Form>
      </div>

      {/* Scoped to this standalone page; the embedded app inherits admin styling. */}
      <style>{`
        .login {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f6f6f7;
          color: #1a1a1a;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .login__card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 2px rgba(0,0,0,.05);
        }
        .login__title { margin: 0 0 6px; line-height: 0; } .login__title img { display: block; height: 40px; width: auto; }
        .login__subtitle { margin: 0 0 24px; color: #616161; font-size: 14px; }
        .login__form { display: flex; flex-direction: column; gap: 6px; }
        .login__label { font-size: 13px; font-weight: 600; }
        .login__input {
          font: inherit;
          padding: 10px 12px;
          border: 1px solid #8a8a8a;
          border-radius: 8px;
          background: #fff;
        }
        .login__input:focus-visible {
          outline: 2px solid #6366F1;
          outline-offset: 1px;
          border-color: #6366F1;
        }
        .login__input[aria-invalid="true"] { border-color: #c5280c; }
        .login__hint { margin: 2px 0 12px; font-size: 12px; color: #616161; }
        .login__error { margin: 2px 0 12px; font-size: 12px; color: #c5280c; font-weight: 500; }
        .login__button {
          font: inherit;
          font-weight: 600;
          padding: 10px 16px;
          border: 0;
          border-radius: 8px;
          background: #4F46E5;
          color: #fff;
          cursor: pointer;
        }
        .login__button:hover:not(:disabled) { background: #3730A3; }
        .login__button:disabled { opacity: .6; cursor: default; }
        .login__button:focus-visible { outline: 2px solid #6366F1; outline-offset: 2px; }
        @media (prefers-color-scheme: dark) {
          .login { background: #1a1a1a; color: #e3e3e3; }
          .login__card { background: #242424; border-color: #3a3a3a; }
          .login__subtitle, .login__hint { color: #b5b5b5; }
          .login__input { background: #303030; border-color: #616161; color: #e3e3e3; }
          .login__button { background: #6366F1; color: #fff; }
          .login__button:hover:not(:disabled) { background: #818CF8; }
        }
      `}</style>
    </main>
  );
}
