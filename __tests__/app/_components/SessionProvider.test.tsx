import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionProvider } from "~/app/_components/SessionProvider";
import type { Session } from "next-auth";

// Mock next-auth/react with a more specific testid
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nextauth-session-provider">{children}</div>
  ),
}));

describe("SessionProvider", () => {
  it("renders children within SessionProvider", () => {
    const mockSession: Session = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    const { container } = render(
      <SessionProvider session={mockSession}>
        <div data-testid="test-child">Test Child</div>
      </SessionProvider>,
    );

    // Use container to scope the query to this specific render
    const sessionProvider = container.querySelector('[data-testid="nextauth-session-provider"]');
    const testChild = container.querySelector('[data-testid="test-child"]');
    
    expect(sessionProvider).toBeDefined();
    expect(testChild).toBeDefined();
    expect(testChild?.textContent).toBe("Test Child");
  });

  it("handles null session", () => {
    const { container } = render(
      <SessionProvider session={null}>
        <div data-testid="test-child">Test Child</div>
      </SessionProvider>,
    );

    // Use container to scope the query to this specific render
    const sessionProvider = container.querySelector('[data-testid="nextauth-session-provider"]');
    const testChild = container.querySelector('[data-testid="test-child"]');
    
    expect(sessionProvider).toBeDefined();
    expect(testChild).toBeDefined();
    expect(testChild?.textContent).toBe("Test Child");
  });
});
