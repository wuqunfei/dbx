import { ref, watch } from "vue";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/backend/safeStorage";
import type { DatabaseType } from "@/types/generated/databaseTypes";

const LAKE_STUDIO_MODE_STORAGE_KEY = "dbx-lake-studio-mode";
const LAKE_STUDIO_DB_TYPES: DatabaseType[] = ["duckdb"];

const lakeStudioModeEnabled = ref(safeLocalStorageGet(LAKE_STUDIO_MODE_STORAGE_KEY) === "true");

watch(
  lakeStudioModeEnabled,
  (enabled) => {
    safeLocalStorageSet(LAKE_STUDIO_MODE_STORAGE_KEY, enabled ? "true" : "false");
  },
  { flush: "sync" },
);

export function useLakeStudioMode() {
  function toggleLakeStudioMode() {
    lakeStudioModeEnabled.value = !lakeStudioModeEnabled.value;
  }

  return {
    lakeStudioModeEnabled,
    toggleLakeStudioMode,
    lakeStudioDbTypes: LAKE_STUDIO_DB_TYPES,
  };
}
