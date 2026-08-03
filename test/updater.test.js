const { isNewerThan } = require("../src/updater");

describe("isNewerThan", () => {
  test("detects newer version", () => {
    expect(isNewerThan("0.9.3", "0.9.2")).toBe(true);
    expect(isNewerThan("v0.10.0", "0.9.2")).toBe(true);
    expect(isNewerThan("1.0.0", "0.9.2")).toBe(true);
    expect(isNewerThan("0.9.3", "0.9.3")).toBe(false);
  });

  test("rejects older or equal versions", () => {
    expect(isNewerThan("0.9.1", "0.9.2")).toBe(false);
    expect(isNewerThan("0.9.2", "0.9.2")).toBe(false);
    expect(isNewerThan("0.8.0", "0.9.2")).toBe(false);
  });

  test("handles invalid input", () => {
    expect(isNewerThan("abc", "0.9.2")).toBe(false);
    expect(isNewerThan("", "0.9.2")).toBe(false);
    expect(isNewerThan(null, "0.9.2")).toBe(false);
    expect(isNewerThan("0.9.3", "invalid")).toBe(false);
  });
});
