import { create } from "zustand";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, Store } from "@/types";

interface AuthState {
  user: any | null;
  profile: Profile | null;
  store: Store | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  store: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ user: null, profile: null, store: null, isLoading: false, isInitialized: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();

      // If vendor, fetch their store
      let store: Store | null = null;
      if (profile?.role === "vendor") {
        const { data } = await supabase
          .from("stores").select("*").eq("owner_id", user.id).single();
        store = data as Store | null;
      }

      set({ user, profile, store, isLoading: false, isInitialized: true });

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          set({ user: null, profile: null, store: null });
        } else if (event === "SIGNED_IN" && session?.user) {
          set({ user: session.user });
          await get().refreshProfile();
        }
      });
    } catch {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient();
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, store: null, isLoading: false });
  },

  refreshProfile: async () => {
    const supabase = getSupabaseBrowserClient();
    const { user } = get();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    let store: Store | null = null;
    if (profile?.role === "vendor") {
      const { data } = await supabase
        .from("stores").select("*").eq("owner_id", user.id).single();
      store = data as Store | null;
    }

    set({ profile, store });
  },
}));
