import { useEffect } from "react";
import { toast } from "sonner";

import { SAVE_FAILED_EVENT, migrateInlinePhotos } from "@/lib/storage";

/**
 * Warns whenever a job save is refused (storage full), and once per visit moves photos saved
 * inside older jobs into the photo store to free space. Nothing is ever deleted here.
 */
export function StorageWatcher() {
  useEffect(() => {
    let last = 0;
    const onFail = () => {
      if (Date.now() - last < 8000) return;
      last = Date.now();
      toast.error(
        "Not saved — this device's storage is full. Export a backup in Settings, then remove photos or old jobs.",
        {
          duration: 10000,
        },
      );
    };
    window.addEventListener(SAVE_FAILED_EVENT, onFail);
    void migrateInlinePhotos().catch(() => 0);
    return () => window.removeEventListener(SAVE_FAILED_EVENT, onFail);
  }, []);
  return null;
}
