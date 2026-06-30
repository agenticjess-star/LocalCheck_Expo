import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  elo: number;
  wins: number;
  losses: number;
  check_ins: number;
  tier: string;
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  ensureProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data as UserProfile);
      }
    } catch {
      // Profile may not exist yet
    }
  }, []);

  const ensureProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .single();

    if (!existing) {
      const displayName =
        currentUser.user_metadata?.display_name ??
        currentUser.user_metadata?.full_name ??
        currentUser.email?.split("@")[0] ??
        "Player";

      await supabase.from("profiles").insert({
        id: currentUser.id,
        display_name: displayName,
        elo: 1200,
        wins: 0,
        losses: 0,
        check_ins: 0,
        tier: "BRONZE",
      });
    }

    await fetchProfile(currentUser.id);
  }, [fetchProfile]);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (!error) {
        await ensureProfile();
      }
      return { error: error?.message ?? null };
    },
    [ensureProfile]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        await ensureProfile();
      }
      return { error: error?.message ?? null };
    },
    [ensureProfile]
  );

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== "ios") {
      return { error: "Apple Sign-In is only available on iOS" };
    }
    try {
      const nonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
        nonce,
      });

      if (!error) {
        await ensureProfile();
      }
      return { error: error?.message ?? null };
    } catch (err: any) {
      // ERR_REQUEST_CANCELED means the user dismissed the sheet
      if (err?.code === "ERR_REQUEST_CANCELED") {
        return { error: null };
      }
      return { error: err?.message ?? "Apple Sign-In failed" };
    }
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signUpWithEmail,
        signInWithEmail,
        signInWithApple,
        signOut,
        ensureProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
