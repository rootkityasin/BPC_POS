import { describe, it, expect } from "vitest";

function parseOptions(options, children) {
  if (Array.isArray(options) && options.length > 0) {
    return options.map((opt) =>
      typeof opt === "object" && opt !== null
        ? {
            value: String(opt.value ?? ""),
            label: opt.label ?? opt.value,
            disabled: Boolean(opt.disabled),
            icon: opt.icon
          }
        : { value: String(opt), label: String(opt) }
    );
  }
  return [];
}

function resolveSelectedOption(options, currentValue) {
  return options.find((opt) => String(opt.value) === String(currentValue ?? ""));
}

describe("Select component option resolution", () => {
  it("resolves options from options array", () => {
    const options = parseOptions([
      { value: "", label: "All stores" },
      { value: "store-1", label: "BPC Dhaka" },
      { value: "store-2", label: "BPC Chittagong" }
    ]);

    expect(options.length).toBe(3);
    const selected = resolveSelectedOption(options, "store-1");
    expect(selected?.label).toBe("BPC Dhaka");
  });

  it("handles empty string value as a valid selection (e.g. All stores)", () => {
    const options = parseOptions([
      { value: "", label: "All stores" },
      { value: "store-1", label: "BPC Dhaka" }
    ]);

    const selected = resolveSelectedOption(options, "");
    expect(selected?.label).toBe("All stores");
  });

  it("handles string values correctly", () => {
    const options = parseOptions([
      { value: "all", label: "All statuses" },
      { value: "active", label: "Active only" },
      { value: "inactive", label: "Inactive only" }
    ]);

    const selected = resolveSelectedOption(options, "active");
    expect(selected?.label).toBe("Active only");
  });

  it("handles primitive string array options", () => {
    const options = parseOptions(["cash", "card", "mobile"]);
    expect(options[0]).toEqual({ value: "cash", label: "cash" });
    const selected = resolveSelectedOption(options, "card");
    expect(selected?.label).toBe("card");
  });
});
