import * as React from "react";
import { Users as UsersIcon, Copy, Check, Trash2, UserPlus } from "lucide-react";
import { usersApi } from "@/api";
import type { AuthUser, InviteCode } from "@/types/models";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { RuneDialog } from "@/components/fantasy/RuneDialog";
import { useNotifications } from "@/hooks/useNotifications";

export function UsersPanel() {
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [invites, setInvites] = React.useState<InviteCode[]>([]);
  const [removeTarget, setRemoveTarget] = React.useState<AuthUser | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const [creatingInvite, setCreatingInvite] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const notifications = useNotifications();

  const refresh = React.useCallback(() => {
    usersApi.listUsers().then(setUsers);
    usersApi.listInvites().then(setInvites);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreateInvite() {
    setCreatingInvite(true);
    try {
      const invite = await usersApi.createInvite();
      setInvites((prev) => [...prev, invite]);
      notifications.success({ title: "Invite created", message: "Share the code with your friend." });
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleRevokeInvite(code: string) {
    const next = await usersApi.revokeInvite(code);
    setInvites(next);
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  async function handleRemoveUser() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const next = await usersApi.removeUser(removeTarget.id);
      setUsers(next);
      notifications.warning({ title: "Access revoked", message: `${removeTarget.username} can no longer log in.` });
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  const unusedInvites = invites.filter((i) => !i.usedBy);

  return (
    <ScrollPanel icon={<UsersIcon />} title="Users & Access">
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        You're the super admin: the only one who can grant or revoke access. Friends redeem an invite code once to
        create their own admin account.
      </p>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-2.5"
          >
            <p className="font-display text-sm font-semibold text-parchment-100">
              {u.username}
              {u.role === "super_admin" && (
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-gold-400">Super Admin</span>
              )}
            </p>
            {u.role !== "super_admin" && (
              <RuneButton
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                onClick={() => setRemoveTarget(u)}
              >
                Revoke
              </RuneButton>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-stone-700/60 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-parchment-300/40">Invite Codes</p>
          <RuneButton
            type="button"
            variant="gold"
            size="sm"
            icon={<UserPlus />}
            onClick={handleCreateInvite}
            disabled={creatingInvite}
          >
            {creatingInvite ? "Creating..." : "New Invite"}
          </RuneButton>
        </div>
        {unusedInvites.length === 0 ? (
          <p className="text-sm text-parchment-300/40">No unused invite codes.</p>
        ) : (
          <div className="space-y-2">
            {unusedInvites.map((invite) => (
              <div
                key={invite.code}
                className="flex items-center gap-2 rounded-md border border-stone-700 bg-abyss-900/40 px-3 py-2"
              >
                <span className="flex-1 truncate font-mono text-sm text-parchment-100">{invite.code}</span>
                <RuneButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={copiedCode === invite.code ? <Check /> : <Copy />}
                  onClick={() => handleCopy(invite.code)}
                >
                  {copiedCode === invite.code ? "Copied" : "Copy"}
                </RuneButton>
                <RuneButton type="button" variant="danger" size="sm" onClick={() => handleRevokeInvite(invite.code)}>
                  Revoke
                </RuneButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <RuneDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        tone="danger"
        title="Revoke this admin's access?"
        description={`${removeTarget?.username} will be logged out immediately and won't be able to sign back in.`}
        confirmLabel="Revoke Access"
        onConfirm={handleRemoveUser}
        confirming={removing}
      />
    </ScrollPanel>
  );
}
