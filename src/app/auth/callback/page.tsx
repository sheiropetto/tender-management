"use client";

import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    try {
      // Google redirects back with the ID token in the URL fragment
      // e.g., /auth/callback#id_token=xxx&...
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");

      if (idToken) {
        // Send the ID token to the parent window (the login page)
        if (window.opener) {
          window.opener.postMessage(
            { type: "google-auth", idToken },
            window.location.origin
          );
        }
      }
    } catch (e) {
      console.error("[Auth] Callback error:", e);
    } finally {
      // Close the popup
      window.close();
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <p className="text-sm text-zinc-400">Completing sign-in...</p>
    </div>
  );
}
