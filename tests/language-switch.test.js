import { describe, it, expect } from "vitest";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "../src/modules/i18n/constants.js";
import fs from "fs";
import path from "path";

describe("Language Configuration & Switcher Layout", () => {
  it("defaults system language to Bangla (bn)", () => {
    expect(DEFAULT_LANGUAGE).toBe("bn");
    expect(LANGUAGE_STORAGE_KEY).toBe("bpc-admin-language");
  });

  it("ensures AdminLanguageSwitch places BN on left and EN on right", () => {
    const filePath = path.resolve(__dirname, "../src/components/layout/admin-language-switch.js");
    const content = fs.readFileSync(filePath, "utf-8");

    // BN should appear before EN in the JSX structure
    const bnIndex = content.indexOf("BN");
    const enIndex = content.indexOf("EN");
    expect(bnIndex).toBeGreaterThan(0);
    expect(enIndex).toBeGreaterThan(bnIndex);

    // Left label should trigger setLanguage("bn")
    expect(content).toContain('onClick={() => setLanguage("bn")}');
    expect(content).toContain('onClick={() => setLanguage("en")}');

    // Knob at translate-x-0 should render Bangladesh flag when isBangla is true
    expect(content).toContain('isBangla ? "translate-x-0" : "translate-x-[30px]"');
    expect(content).toContain('isBangla ? <BangladeshFlagIcon /> : <UkFlagIcon />');
  });

  it("ensures login route establishes bn as default language cookie", () => {
    const loginRoutePath = path.resolve(__dirname, "../src/app/api/v1/auth/login/route.js");
    const content = fs.readFileSync(loginRoutePath, "utf-8");

    expect(content).toContain('response.cookies.set(LANGUAGE_STORAGE_KEY, "bn"');
  });
});
