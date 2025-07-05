import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SessionProvider } from "~/app/_components/SessionProvider";
import type { Session } from "next-auth";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
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

    const { getByTestId, getByText } = render(
      <SessionProvider session={mockSession}>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(getByTestId("session-provider")).toBeDefined();
    expect(getByText("Test Child")).toBeDefined();
  });

  it("handles null session", () => {
    const { getByTestId, getByText } = render(
      <SessionProvider session={null}>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(getByTestId("session-provider")).toBeDefined();
    expect(getByText("Test Child")).toBeDefined();
  });
});
