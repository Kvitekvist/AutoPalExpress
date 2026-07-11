import * as React from "react";
import { useTranslation } from "react-i18next";
import { Stethoscope } from "lucide-react";
import { systemSettingsApi } from "@/api";
import { ScrollPanel } from "@/components/fantasy/ScrollPanel";
import { RuneButton } from "@/components/fantasy/RuneButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";

export function DiagnosticsPanel() {
  const { t } = useTranslation();
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<string | null>(null);
  const [reportPath, setReportPath] = React.useState<string | null>(null);
  const notifications = useNotifications();

  async function handleRun() {
    setRunning(true);
    try {
      const result = await systemSettingsApi.runDiagnostics();
      setReport(result.report);
      setReportPath(result.reportPath);
      notifications.success({
        title: t("superAdmin.diagnostics.completeTitle", { defaultValue: "Diagnostics complete" }),
        message: t("superAdmin.diagnostics.completeMessage", { defaultValue: "See the report below." }),
      });
    } catch (e) {
      notifications.error({
        title: t("superAdmin.diagnostics.failedTitle", { defaultValue: "Couldn't run diagnostics" }),
        message: e instanceof Error ? e.message : t("superAdmin.diagnostics.unknownError", { defaultValue: "Unknown error." }),
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScrollPanel
      icon={<Stethoscope />}
      title={t("superAdmin.diagnostics.title", { defaultValue: "Diagnostics" })}
      actions={
        <RuneButton type="button" variant="gold" size="sm" icon={<Stethoscope />} onClick={handleRun} disabled={running}>
          {running ? t("superAdmin.diagnostics.running", { defaultValue: "Running..." }) : t("superAdmin.diagnostics.run", { defaultValue: "Run Diagnostics" })}
        </RuneButton>
      }
    >
      <p className="mb-4 text-xs leading-relaxed text-parchment-300/50">
        {t("superAdmin.diagnostics.description", {
          defaultValue:
            "Checks the active server setup, Palworld files, local game port, Windows Firewall rules, and REST API access, then writes a support report to disk. Windows will ask for permission (a UAC prompt) since checking firewall rules needs admin rights - click \"Yes\" to continue.",
        })}
      </p>

      {running && (
        <p className="mb-3 animate-pulse text-xs text-gold-400">
          {t("superAdmin.diagnostics.waitingForPermission", { defaultValue: "Waiting for the Windows permission prompt..." })}
        </p>
      )}

      {report && (
        <div className="space-y-2">
          <ScrollArea className="h-[360px] rounded-md border border-stone-700 bg-abyss-950/60">
            <pre className="whitespace-pre-wrap p-3 font-mono text-[11px] leading-relaxed text-parchment-200/80">{report}</pre>
          </ScrollArea>
          {reportPath && (
            <p className="truncate font-mono text-[11px] text-parchment-300/40">
              {t("superAdmin.diagnostics.savedTo", { defaultValue: "Saved to {{path}}", path: reportPath })}
            </p>
          )}
        </div>
      )}
    </ScrollPanel>
  );
}
