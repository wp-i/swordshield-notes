import { describe, expect, it } from "vitest";
import { formatTaskCreatedAt } from "./taskTime";

describe("formatTaskCreatedAt", () => {
  it("shows only the time for a task created today", () => {
    const created = new Date(2026, 7, 2, 9, 5).getTime();
    const reference = new Date(2026, 7, 2, 21, 30).getTime();

    expect(formatTaskCreatedAt(created, reference)).toBe("09:05");
  });

  it("shows month, day, and time for an older task", () => {
    const created = new Date(2026, 6, 31, 18, 7).getTime();
    const reference = new Date(2026, 7, 2, 8, 0).getTime();

    expect(formatTaskCreatedAt(created, reference)).toBe("07/31 18:07");
  });
});
