"use client";
import { useEffect, useState, useCallback } from "react";
import { nanoid } from "nanoid";

/**
 * Hook for managing a guest session token.
 * - Persists across reloads (localStorage)
 * - Generates a strong token if needed
 * - Handles claiming and cleanup
 */
export function useGuestSessionToken() {
  const [token, setToken] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    let existing = localStorage.getItem("guest_session_token");
    if (!existing) {
      existing = nanoid();
      localStorage.setItem("guest_session_token", existing);
    }
    setToken(existing);
  }, []);

  // Claim/cleanup the guest session (call after user login and claim)
  const clearToken = useCallback(() => {
    localStorage.removeItem("guest_session_token");
    setToken(null);
  }, []);

  // Refresh token manually if needed (not typical, but useful for testing/dev)
  const regenerateToken = useCallback(() => {
    const newToken = nanoid();
    localStorage.setItem("guest_session_token", newToken);
    setToken(newToken);
  }, []);

  return {
    guestSessionToken: token,
    clearGuestSessionToken: clearToken,
    regenerateGuestSessionToken: regenerateToken,
  };
}
