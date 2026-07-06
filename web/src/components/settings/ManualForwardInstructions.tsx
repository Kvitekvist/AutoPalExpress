interface ManualForwardInstructionsProps {
  name: string;
  protocol: "TCP" | "UDP";
  port: number;
  localIp: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-700/40 py-1.5 last:border-b-0">
      <span className="text-parchment-300/50">{label}</span>
      <span className="font-mono text-parchment-100">{value}</span>
    </div>
  );
}

export function ManualForwardInstructions({ name, protocol, port, localIp }: ManualForwardInstructionsProps) {
  return (
    <div className="rounded-md border border-stone-700 bg-abyss-900/40 px-4 py-3 text-xs">
      <p className="mb-2 text-parchment-300/60">
        Add a new port forwarding rule in your router's admin page with these exact values:
      </p>
      <Row label="Name" value={name} />
      <Row label="Protocol" value={protocol} />
      <Row label="External IP" value="*" />
      <Row label="Internal IP" value={localIp ?? "this PC's local IP - check your network settings"} />
      <Row label="External Port" value={String(port)} />
      <Row label="Internal Port" value={String(port)} />
    </div>
  );
}
