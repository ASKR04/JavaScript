import { describe, expect, it, vi } from "vitest";
import { focusFirstInvalidField } from "./focus-validation";

describe("focusFirstInvalidField", () => {
  it("focuses the first invalid field in the declared reading order", () => {
    const title = { focus: vi.fn() };
    const details = { focus: vi.fn() };
    const schedule = vi.fn((callback: () => void) => callback());

    const scheduled = focusFirstInvalidField(
      ["title", "details"],
      { details: "Add more detail.", title: "Add a title." },
      { title, details },
      schedule,
    );

    expect(scheduled).toBe(true);
    expect(schedule).toHaveBeenCalledOnce();
    expect(title.focus).toHaveBeenCalledOnce();
    expect(details.focus).not.toHaveBeenCalled();
  });

  it("skips an unavailable target and focuses the next invalid field", () => {
    const details = { focus: vi.fn() };

    focusFirstInvalidField(
      ["title", "details"],
      { title: "Add a title.", details: "Add more detail." },
      { details },
      (callback) => callback(),
    );

    expect(details.focus).toHaveBeenCalledOnce();
  });

  it("does not schedule focus when the form has no focusable errors", () => {
    const schedule = vi.fn();

    const scheduled = focusFirstInvalidField(
      ["title"],
      {},
      {},
      schedule,
    );

    expect(scheduled).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });
});
