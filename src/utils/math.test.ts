import { describe, it, expect } from "vitest";
import { add, multiply } from "./math";

// Sample tests
describe("Math utilities", () => {
  describe("add", () => {
    it("should add two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("should add negative numbers", () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it("should handle zero", () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe("multiply", () => {
    it("should multiply two positive numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("should handle zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });

    it("should handle negative numbers", () => {
      expect(multiply(-2, 3)).toBe(-6);
    });
  });
});
