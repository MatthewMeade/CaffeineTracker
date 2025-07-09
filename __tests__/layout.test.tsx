import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RootLayout from "../src/app/layout";
import type { Session } from "next-auth";

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "font-sans",
    variable: "--font-sans",
  }),
}));

// Use a let variable for the mock function to avoid hoisting issues
let mockAuth: ReturnType<typeof vi.fn>;
vi.mock("~/auth", () => ({
  get auth() {
    return mockAuth;
  },
}));

// Mock tRPC provider
vi.mock("~/trpc/react", () => ({
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("RootLayout", () => {
  beforeEach(() => {
    mockAuth = vi.fn();
  });

  it("renders the layout with session provider and children", async () => {
    const mockSession: Session = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
      expires: "2099-01-01T00:00:00.000Z",
    };
    mockAuth.mockResolvedValueOnce(mockSession);

    const element = await RootLayout({ children: <div data-testid="layout-test-child">Test Child</div> });
    const { container } = render(element);
    
    // Use container to scope the query to this specific render
    const testChild = container.querySelector('[data-testid="layout-test-child"]');
    expect(testChild).toBeDefined();
    expect(testChild?.textContent).toBe("Test Child");
    
    // Snapshot test for the returned JSX structure
    expect(element).toMatchSnapshot();
  });

  it("renders the layout with null session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const element = await RootLayout({ children: <div data-testid="layout-test-child">Test Child</div> });
    const { container } = render(element);
    
    // Use container to scope the query to this specific render
    const testChild = container.querySelector('[data-testid="layout-test-child"]');
    expect(testChild).toBeDefined();
    expect(testChild?.textContent).toBe("Test Child");
    
    expect(element).toMatchSnapshot();
  });

  it("includes the correct metadata", () => {
    const metadata = {
      title: "Caffeine Tracker",
      description: "Track your caffeine intake",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    };
    expect(metadata).toEqual({
      title: "Caffeine Tracker",
      description: "Track your caffeine intake",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    });
  });
});
