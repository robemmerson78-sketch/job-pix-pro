import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyImport, downloadBackup, previewImport } from "@/lib/backup";
import { parseBackup, type Backup, type ImportPlan } from "@/lib/backup-core";

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "export" | "import">("");
  const [pending, setPending] = useState<{ backup: Backup; plan: ImportPlan } | null>(null);
  const [restoreSettings, setRestoreSettings] = useState(false);

  const exportNow = async () => {
    setBusy("export");
    try {
      const r = await downloadBackup();
      const mb = (r.bytes / 1024 / 1024).toFixed(1);
      toast.success(`Backup saved: ${r.jobs} jobs, ${r.photos} photos (${mb} MB).`);
      if (r.missing)
        toast.message(
          `${r.missing} photo(s) couldn't be read on this device and are not in the backup.`,
        );
    } catch {
      toast.error("Couldn't create the backup. Nothing on this device was changed.");
    } finally {
      setBusy("");
    }
  };

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large to be a JobPix backup.");
      return;
    }
    setBusy("import");
    try {
      const res = parseBackup(await file.text());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRestoreSettings(false);
      setPending({ backup: res.backup, plan: previewImport(res.backup) });
    } catch {
      toast.error("Couldn't read that file.");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy("import");
    try {
      const r = await applyImport(pending.backup, pending.plan, restoreSettings);
      if (!r.ok) toast.error("Not imported — this device's storage is full. Nothing was changed.");
      else {
        toast.success(
          `Imported ${r.jobs} job(s).${r.settingsRestored ? " Settings restored." : ""}`,
        );
        if (restoreSettings && !r.settingsRestored) toast.error("Some settings couldn't be saved.");
        setPending(null);
      }
    } finally {
      setBusy("");
    }
  };

  const p = pending?.plan;
  const b = pending?.backup;
  const hasSettings = !!(b?.contractor || b?.preferences || b?.quoteDefaults);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Your jobs live only on this device. Export a backup file regularly and keep it somewhere
        safe (email it to yourself or save it to cloud storage). It includes jobs, photos, your
        business profile, quote defaults and preferences. Photos make the file large. Sharper
        analysis copies are not included.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-12" onClick={exportNow} disabled={!!busy}>
          {busy === "export" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export backup
        </Button>
        <Button
          variant="secondary"
          className="h-12"
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
        >
          {busy === "import" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Restore backup
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              {b?.exportedAt ? `Made ${new Date(b.exportedAt).toLocaleString()}. ` : ""}
              Jobs already on this device are never replaced.
            </DialogDescription>
          </DialogHeader>
          {p ? (
            <ul className="space-y-1 text-sm">
              <li>{p.added.length} new job(s) will be added.</li>
              <li>
                {p.copies.length} job(s) differ from the version here and will be added as
                "(restored)" copies.
              </li>
              <li>{p.skipped.length} job(s) are already here unchanged and will be skipped.</li>
            </ul>
          ) : null}
          {hasSettings ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={restoreSettings}
                onChange={(e) => setRestoreSettings(e.target.checked)}
              />
              Also replace my business profile, quote defaults and preferences with the ones in this
              backup.
            </label>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={!!busy || !p || (!p.added.length && !p.copies.length && !restoreSettings)}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
