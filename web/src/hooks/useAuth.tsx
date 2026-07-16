import * as React from "react";
import { authApi } from "@/api";
import { UNAUTHORIZED_EVENT } from "@/api/httpClient";
import type { AuthUser } from "@/types/models";
import { SetupScreen } from "@/components/auth/SetupScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { SpaceInvadersGame } from "@/components/fantasy/SpaceInvadersGame";
import { setLanguage as setI18nLanguage } from "@/i18n";

interface AuthContextValue {
  user: AuthUser;
  logout: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

type Phase = "loading" | "needs-setup" | "needs-login" | "authed";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [user, setUser] = React.useState<AuthUser | null>(null);

  const checkAuth = React.useCallback(async () => {
    const status = await authApi.getStatus();
    if (status.needsSetup) {
      setPhase("needs-setup");
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      setI18nLanguage(me.language);
      setPhase("authed");
    } catch {
      setPhase("needs-login");
    }
  }, []);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  React.useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setPhase("needs-login");
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setPhase("needs-login");
  }, []);

  function handleAuthed(nextUser: AuthUser) {
    setUser(nextUser);
    setI18nLanguage(nextUser.language);
    setPhase("authed");
  }

  const updateLanguage = React.useCallback(async (language: string) => {
    const updated = await authApi.setLanguage(language);
    setUser(updated);
    setI18nLanguage(updated.language);
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-noise text-parchment-300/50">
        <SpaceInvadersGame caption="Use ← → and Space while the realm awakens..." />
      </div>
    );
  }

  if (phase === "needs-setup") {
    return <SetupScreen onDone={handleAuthed} />;
  }

  if (phase === "needs-login") {
    return <LoginScreen onDone={handleAuthed} />;
  }

  return (
    <AuthContext.Provider value={{ user: user!, logout, setLanguage: updateLanguage }}>{children}</AuthContext.Provider>
  );
}
