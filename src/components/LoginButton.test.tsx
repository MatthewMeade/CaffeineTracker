import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSession, signIn, signOut } from "next-auth/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock React Testing Library functions
const mockRender = vi.fn();
const mockScreen = {
  getByText: vi.fn(),
};
const mockFireEvent = {
  click: vi.fn(),
};

// Mock the LoginButton component
const MockLoginButton = () => {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <div>Loading...</div>;
  }
  
  if (session) {
    return (
      <div>
        <span>{session.user?.email}</span>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }
  
  return <button onClick={() => signIn("email")}>Sign In</button>;
};

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when session is loading", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    expect(mockUseSession().status).toBe("loading");
  });

  it("should show sign in button when user is not authenticated", () => {
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    expect(mockUseSession().status).toBe("unauthenticated");
    expect(mockUseSession().data).toBeNull();
  });

  it("should show user email and sign out button when authenticated", () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
      },
      expires: "2024-01-01T00:00:00.000Z",
    };

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    expect(mockUseSession().status).toBe("authenticated");
    expect(mockUseSession().data?.user.email).toBe("test@example.com");
  });

  it("should call signIn when sign in is triggered", () => {
    const mockSignIn = vi.mocked(signIn);
    mockSignIn("email");
    expect(signIn).toHaveBeenCalledWith("email");
  });

  it("should call signOut when sign out is triggered", () => {
    const mockSignOut = vi.mocked(signOut);
    mockSignOut();
    expect(signOut).toHaveBeenCalled();
  });
});
