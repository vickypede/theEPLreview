"use client";

import { useEffect, useRef } from "react";

type Props = {
  widgetId: string;
  scriptSrc: string;
  className?: string;
  style?: React.CSSProperties;
  showAttribution?: boolean;
};

/**
 * Embeds a ScoreAxis widget using the "widgets.scoreaxis.com/api/..." script format.
 * We inject the <script> tag on the client to keep Next.js SSR stable.
 */
export default function ScoreAxisWidget({
  widgetId,
  scriptSrc,
  className,
  style,
  showAttribution = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Remove any previously injected widget script (important for client-side navigation).
    const prev = root.querySelector<HTMLScriptElement>('script[data-scoreaxis="1"]');
    if (prev) prev.remove();

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.dataset.scoreaxis = "1";

    // Insert script first, leaving the attribution DOM in place.
    root.insertBefore(script, root.firstChild);

    return () => {
      script.remove();
    };
  }, [scriptSrc]);

  return (
    <div
      id={`widget-${widgetId}`}
      ref={rootRef}
      className={["scoreaxis-widget", className].filter(Boolean).join(" ")}
      style={{
        width: "auto",
        height: "auto",
        fontSize: 14,
        backgroundColor: "#ffffff",
        color: "#141416",
        border: "1px solid",
        borderColor: "#ecf1f7",
        overflow: "auto",
        ...style,
      }}
    >
      {showAttribution && (
        <div className="widget-main-link" style={{ padding: "6px 12px", fontWeight: 500 }}>
          Live data by{" "}
          <a href="https://www.scoreaxis.com/" style={{ color: "inherit" }}>
            Scoreaxis
          </a>
        </div>
      )}
    </div>
  );
}


