"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type UserProfile = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  // Merge incoming profile fields into the existing userProfile state
  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...(prev as UserProfile), ...profile }));
  };

  const refreshProfile = async () => {
    if (!user) return;
    if (!user) return;
    const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) {
      setUserProfile(data as UserProfile);
    }
    // If there was an error, you could handle it here (optional)
  };

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    // Prevent server/client mismatch by not rendering children until auth state is known
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, session, isLoading, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
