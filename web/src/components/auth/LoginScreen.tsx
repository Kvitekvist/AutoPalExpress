import * as React from "react";
import { KeyRound } from "lucide-react";
import { authApi } from "@/api";
import type { AuthUser } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { cn } from "@/lib/utils";

interface LoginScreenProps {
  onDone: (user: AuthUser) => void;
}

type Mode = "login" | "register";

export function LoginScreen({ onDone }: LoginScreenProps) {
  const [mode, setMode] = React.useState<Mode>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user =
        mode === "login"
          ? await authApi.login(username.trim(), password)
          : await authApi.register(username.trim(), password, inviteCode.trim());
      onDone(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-noise px-4">
      <div className="w-full max-w-md">
        <ScrollPanel icon={<KeyRound />} title={mode === "login" ? "Enter the Realm" : "Request Admission"}>
          <div className="mb-4 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={cn(
                "rounded-md border px-3 py-1.5 transition-colors",
                mode === "login"
                  ? "border-gold-500/50 bg-gold-500/10 text-gold-300"
                  : "border-stone-700 text-parchment-300/50 hover:border-stone-600"
              )}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={cn(
                "rounded-md border px-3 py-1.5 transition-colors",
                mode === "register"
                  ? "border-gold-500/50 bg-gold-500/10 text-gold-300"
                  : "border-stone-700 text-parchment-300/50 hover:border-stone-600"
              )}
            >
              I Have an Invite
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auth-username">Username</Label>
              <Input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Password</Label>
              <PasswordInput
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : undefined}
              />
            </div>
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-invite">Invite Code</Label>
                <Input
                  id="auth-invite"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="From whoever runs this server"
                  required
                />
              </div>
            )}
            {error && <p className="text-xs text-blood-400">{error}</p>}
            <RuneButton type="submit" variant="gold" className="w-full" disabled={submitting}>
              {submitting ? "Working..." : mode === "login" ? "Log In" : "Create Account"}
            </RuneButton>
          </form>
        </ScrollPanel>
      </div>
    </div>
  );
}
