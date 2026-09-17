// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useLakeStudioMode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("defaults to disabled when nothing is persisted", async () => {
    const { useLakeStudioMode } = await import("../useLakeStudioMode");
    const { lakeStudioModeEnabled } = useLakeStudioMode();
    expect(lakeStudioModeEnabled.value).toBe(false);
  });

  it("restores the persisted enabled state on load", async () => {
    localStorage.setItem("dbx-lake-studio-mode", "true");
    const { useLakeStudioMode } = await import("../useLakeStudioMode");
    const { lakeStudioModeEnabled } = useLakeStudioMode();
    expect(lakeStudioModeEnabled.value).toBe(true);
  });

  it("toggling flips the state and persists it", async () => {
    const { useLakeStudioMode } = await import("../useLakeStudioMode");
    const { lakeStudioModeEnabled, toggleLakeStudioMode } = useLakeStudioMode();
    expect(lakeStudioModeEnabled.value).toBe(false);
    toggleLakeStudioMode();
    expect(lakeStudioModeEnabled.value).toBe(true);
    expect(localStorage.getItem("dbx-lake-studio-mode")).toBe("true");
    toggleLakeStudioMode();
    expect(lakeStudioModeEnabled.value).toBe(false);
    expect(localStorage.getItem("dbx-lake-studio-mode")).toBe("false");
  });

  it("exposes duckdb as the sole lake studio db type", async () => {
    const { useLakeStudioMode } = await import("../useLakeStudioMode");
    const { lakeStudioDbTypes } = useLakeStudioMode();
    expect(lakeStudioDbTypes).toEqual(["duckdb"]);
  });

  it("shares state across multiple calls (module-level singleton)", async () => {
    const { useLakeStudioMode } = await import("../useLakeStudioMode");
    const a = useLakeStudioMode();
    const b = useLakeStudioMode();
    a.toggleLakeStudioMode();
    expect(b.lakeStudioModeEnabled.value).toBe(true);
  });
});
