import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, Store } from "@/types";

type AuthSubscription = { unsubscribe: () => void } | null;

let authSubscription: AuthSubscription = null;

interface AuthState {
  user: User | null;
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ user: null, profile: null, store: null, isLoading: false, isInitialized: true });
      } else {
        const { profile, store } = await loadProfileContext(user);
        set({ user, profile, store, isLoading: false, isInitialized: true });
      }

      authSubscription?.unsubscribe();
      authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          set({ user: null, profile: null, store: null, isLoading: false, isInitialized: true });
        } else if (event === "SIGNED_IN" && session?.user) {
          set({ user: session.user, isLoading: true });
          const { profile, store } = await loadProfileContext(session.user);
          set({ user: session.user, profile, store, isLoading: false, isInitialized: true });
        }
      }).data.subscription;
    } catch {
      set({ user: null, profile: null, store: null, isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const supabase = getSupabaseBrowserClient();
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, store: null, isLoading: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { profile, store } = await loadProfileContext(user);
    set({ profile, store });
  },
}));

async function loadProfileContext(user: User): Promise<Pick<AuthState, "profile" | "store">> {
  const supabase = getSupabaseBrowserClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  let store: Store | null = null;
  if (profile?.role === "vendor") {
    const { data } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
    store = data as Store | null;
  }

  return {
    profile: (profile as Profile | null) ?? null,
    store,
  };
}
