/* Copyright 2024 Marimo. All rights reserved. */

import posthog from "posthog-js";
import { mount } from "@/oso-mount";

declare global {
  interface Window {
    __MARIMO_MOUNT_CONFIG__: unknown;
  }
}

if (import.meta.env.VITE_POSTHOG_PUBLIC_API_KEY) {
  // Read identity passed from the parent page via URL fragment to stitch events
  // under the same distinct_id without emitting a spurious $identify event.
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const distinctID = fragment.get("posthogDistinctId") ?? undefined;
  const sessionID = fragment.get("posthogSessionId") ?? undefined;

  // Strip the identity params from the URL once consumed, so they don't linger
  // in a shareable/openable link and stitch events under the wrong identity.
  // Only the PostHog keys are removed; any other fragment state is preserved.
  if (distinctID || sessionID) {
    fragment.delete("posthogDistinctId");
    fragment.delete("posthogSessionId");
    const rest = fragment.toString();
    history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        (rest ? `#${rest}` : ""),
    );
  }

  posthog.init(import.meta.env.VITE_POSTHOG_PUBLIC_API_KEY, {
    bootstrap: distinctID
      ? { distinctID, sessionID, isIdentifiedID: true }
      : undefined,
    session_recording: {
      // WARNING: Only enable this if you understand the security implications
      recordCrossOriginIframes: true,
    },
  });
} else {
  console.warn("POSTHOG_PUBLIC_API_KEY not set, skipping posthog init");
}

// eslint-disable-next-line ssr-friendly/no-dom-globals-in-module-scope
const el = document.getElementById("root");
if (el) {
  if (!window.__MARIMO_MOUNT_CONFIG__) {
    throw new Error("[marimo] mount config not found");
  }
  mount(window.__MARIMO_MOUNT_CONFIG__, el).catch((e) => {
    console.error("Failed to mount marimo app", e);
  });
} else {
  throw new Error("[marimo] root element not found");
}
