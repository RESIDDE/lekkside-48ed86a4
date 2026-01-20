import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendAuthOtp: (email: string) => Promise<{ error: Error | null; debugCode?: string }>;
  verifyAuthOtp: (email: string, code: string, fullName?: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendAuthOtp = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, purpose: 'auth' }
      });

      if (error) {
        return { error: new Error(error.message || 'Failed to send verification code') };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      return { error: null, debugCode: data?.debugCode };
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to send verification code') };
    }
  };

  const verifyAuthOtp = async (email: string, code: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-with-otp', {
        body: { email, code, fullName }
      });

      if (error) {
        return { error: new Error(error.message || 'Failed to verify code') };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      if (data?.token && data?.type) {
        // Use the token to verify and create session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token,
          type: data.type,
        });

        if (verifyError) {
          return { error: new Error(verifyError.message) };
        }

        return { error: null, isNewUser: data.isNewUser };
      }

      return { error: new Error('Invalid response from server') };
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to verify code') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendAuthOtp, verifyAuthOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
