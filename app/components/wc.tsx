/**
 * Polaris web components with event handlers that actually fire.
 *
 * React attaches its event handlers once, at the document root, and relies on
 * events bubbling up to it. Polaris web components handle `click`, `input` and
 * `change` inside their own shadow DOM and do not reliably let them reach the
 * root, so `onClick` on an `<s-button>` silently does nothing in production.
 * These wrappers attach native listeners directly to the element instead.
 * Handlers receive `{ currentTarget }` so call sites read the same as React's.
 */
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";

interface WcTarget {
  value: string;
  checked: boolean;
  values: string[];
}
type WcHandler = (event: { currentTarget: WcTarget }) => void;

function useNativeEvents(handlers: Record<string, WcHandler | undefined>) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const attached = useRef<{ node: HTMLElement; listeners: [string, EventListener][] } | null>(null);

  // Listeners go on in the ref callback, the moment the element exists, and
  // always call the latest handler, so re-renders never need to re-attach.
  return useCallback((node: HTMLElement | null) => {
    if (attached.current) {
      const { node: previous, listeners } = attached.current;
      listeners.forEach(([name, listener]) => previous.removeEventListener(name, listener));
      attached.current = null;
    }
    if (!node) return;
    const listeners = (["click", "input", "change"] as const).map((name) => {
      const listener: EventListener = () => latest.current[name]?.({ currentTarget: node as unknown as WcTarget });
      node.addEventListener(name, listener);
      return [name, listener] as [string, EventListener];
    });
    attached.current = { node, listeners };
  }, []);
}

type Clickable<T> = Omit<T, "onClick" | "ref"> & { onClick?: () => void };
type Field<T> = Omit<T, "onInput" | "onChange" | "ref"> & { onInput?: WcHandler; onChange?: WcHandler };

export function Button({ onClick, ...props }: Clickable<ComponentProps<"s-button">>) {
  const ref = useNativeEvents({ click: onClick ? () => onClick() : undefined });
  return <s-button ref={ref as never} {...props} />;
}

export function Clickable({ onClick, ...props }: Clickable<ComponentProps<"s-clickable">>) {
  const ref = useNativeEvents({ click: onClick ? () => onClick() : undefined });
  return <s-clickable ref={ref as never} {...props} />;
}

export function TextField({ onInput, onChange, ...props }: Field<ComponentProps<"s-text-field">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-text-field ref={ref as never} {...props} />;
}

export function TextArea({ onInput, onChange, ...props }: Field<ComponentProps<"s-text-area">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-text-area ref={ref as never} {...props} />;
}

export function SearchField({ onInput, onChange, ...props }: Field<ComponentProps<"s-search-field">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-search-field ref={ref as never} {...props} />;
}

export function DateField({ onInput, onChange, ...props }: Field<ComponentProps<"s-date-field">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-date-field ref={ref as never} {...props} />;
}

export function Checkbox({ onInput, onChange, ...props }: Field<ComponentProps<"s-checkbox">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-checkbox ref={ref as never} {...props} />;
}

export function Select({ onInput, onChange, ...props }: Field<ComponentProps<"s-select">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-select ref={ref as never} {...props} />;
}

export function NumberField({ onInput, onChange, ...props }: Field<ComponentProps<"s-number-field">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-number-field ref={ref as never} {...props} />;
}

export function ChoiceList({ onInput, onChange, ...props }: Field<ComponentProps<"s-choice-list">>) {
  const ref = useNativeEvents({ input: onInput, change: onChange });
  return <s-choice-list ref={ref as never} {...props} />;
}

/**
 * A destructive button that asks for a second click instead of window.confirm,
 * which Chrome silently blocks inside the cross-origin admin iframe (and which
 * App Store review rejects). The first click arms it for a few seconds.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  ...props
}: Omit<ComponentProps<"s-button">, "onClick"> & { onConfirm: () => void; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...props}
      tone="critical"
      variant={armed ? "primary" : props.variant}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
