"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, profile, store, isLoading, isInitialized, initialize, signOut, refreshProfile } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  return {
    user,
    profile,
    store,
    isLoading,
    isAuthenticated: !!user,
    isVendor: profile?.role === "vendor",
    isAdmin: profile?.role === "admin",
    isBuyer: profile?.role === "buyer",
    signOut,
    refreshProfile,
  };
}
