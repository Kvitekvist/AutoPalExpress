import * as React from "react";
import { ShieldHalf } from "lucide-react";
import { authApi } from "@/api";
import type { AuthUser } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneButton } from "@/components/fantasy/RuneButton";

interface SetupScreenProps {
  onDone: (user: AuthUser) => void;
}

export function SetupScreen({ onDone }: SetupScreenProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await authApi.setup(username.trim(), password);
      onDone(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-noise px-4">
      <div className="w-full max-w-md">
        <ScrollPanel icon={<ShieldHalf />} title="Claim This Server">
          <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
            No admin account exists yet on this machine. Create the first one - it becomes the permanent super admin,
            the only account that can grant others access.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="setup-username">Username</Label>
              <Input
                id="setup-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                minLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-confirm">Confirm Password</Label>
              <Input
                id="setup-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-xs text-blood-400">{error}</p>}
            <RuneButton type="submit" variant="gold" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create Super Admin Account"}
            </RuneButton>
          </form>
        </ScrollPanel>
      </div>
    </div>
  );
}
