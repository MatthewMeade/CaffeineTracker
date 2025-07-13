import { describe, it, expect, beforeEach, vi } from "vitest";
import { authOptions } from "~/server/auth/config";

// Mock the createId function
vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-id-123",
}));

describe("Auth Config", () => {
  describe("configuration", () => {
    it("should have providers configured", () => {
      expect(authOptions.providers).toBeDefined();
      expect(authOptions.providers.length).toBeGreaterThan(0);
    });

    it("should have email provider configured", () => {
      // Check if any provider has id 'email'
      const hasEmailProvider = authOptions.providers.some(
        (p) =>
          typeof p === "object" && p !== null && "id" in p && p.id === "email",
      );
      expect(hasEmailProvider).toBe(true);
    });

    it("should have anonymous provider configured", () => {
      // Check if any provider has id 'anonymous'
      const hasAnonymousProvider = authOptions.providers.some(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          "id" in p &&
          p.id === "anonymous",
      );
      expect(hasAnonymousProvider).toBe(true);
    });

    it("should use JWT session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have required callbacks configured", () => {
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(authOptions.callbacks?.signIn).toBeDefined();
    });
  });
});
