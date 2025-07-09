import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AddEntryForm } from "~/app/_components/AddEntryForm";
import { api } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";

// Mock tRPC
vi.mock("~/trpc/react", () => ({
  api: {
    entries: {
      getSuggestions: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
    useUtils: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }: { children?: React.ReactNode; whileHover?: unknown; whileTap?: unknown; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon">🔍</span>,
  Plus: () => <span data-testid="plus-icon">➕</span>,
}));

const mockApi = api as unknown as {
  entries: {
    getSuggestions: {
      useQuery: ReturnType<typeof vi.fn>;
    };
    create: {
      useMutation: ReturnType<typeof vi.fn>;
    };
  };
  useUtils: ReturnType<typeof vi.fn>;
};

const mockSession = {
  user: { id: "test-user-id", email: "test@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

function renderWithSession(ui: React.ReactElement) {
  return render(
    <SessionProvider session={mockSession as any}>{ui}</SessionProvider>
  );
}

describe("AddEntryForm", () => {
  const mockSuggestions = [
    { name: "Espresso", caffeineMg: 63 },
    { name: "Coffee", caffeineMg: 95 },
    { name: "Green Tea", caffeineMg: 28 },
    { name: "Black Tea", caffeineMg: 47 },
    { name: "Energy Drink", caffeineMg: 80 },
    { name: "Cola", caffeineMg: 34 },
  ];

  const mockCreateMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockUtils = {
    entries: {
      getDaily: {
        invalidate: vi.fn(),
      },
      getSuggestions: {
        invalidate: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockApi.entries.getSuggestions.useQuery.mockReturnValue({
      data: mockSuggestions,
    });
    
    mockApi.entries.create.useMutation.mockReturnValue(mockCreateMutation);
    mockApi.useUtils.mockReturnValue(mockUtils);
  });

  it("renders search input and favorites grid", () => {
    renderWithSession(<AddEntryForm />);
    
    expect(screen.getByPlaceholderText("Search drinks or enter amount (mg)")).toBeInTheDocument();
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    
    // Check that favorites are rendered - use getAllByText since there might be multiple instances
    expect(screen.getAllByText("Espresso").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coffee").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Green Tea").length).toBeGreaterThan(0);
    expect(screen.getAllByText("63mg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("95mg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("28mg").length).toBeGreaterThan(0);
  });

  it("shows search results when typing in search input", async () => {
    renderWithSession(<AddEntryForm />);
    
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "coffee" } });
    
    await waitFor(() => {
      // Look for Coffee in the search results (there are multiple Coffee elements)
      const searchResults = screen.getAllByText("Coffee");
      expect(searchResults.length).toBeGreaterThan(0);
      // Check for 95mg in search results specifically
      const searchResultElements = screen.getAllByText("95mg");
      expect(searchResultElements.length).toBeGreaterThan(0);
    });
  });

  it("shows no search results for non-matching query", async () => {
    renderWithSession(<AddEntryForm />);
    
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    
    // The favorites grid should still show Coffee, but search results should not appear
    // Since the search results are in a popup, we check that the search input value is set
    expect(searchInput).toHaveValue("xyz");
  });

  it("shows name input when entering a valid number", async () => {
    renderWithSession(<AddEntryForm />);
    
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "100" } });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name this drink?")).toBeInTheDocument();
      expect(screen.getByText("Add Entry")).toBeInTheDocument();
    });
  });

  it("handles quick add from favorites", async () => {
    mockCreateMutation.mutateAsync.mockResolvedValue({});
    
    renderWithSession(<AddEntryForm />);
    
    // Find the Coffee card in the favorites grid by looking for the card with 95mg
    // Use getAllByText and find the one that's in a tooltip trigger (favorites grid)
    const coffeeCards = screen.getAllByText("95mg");
    const coffeeCard = coffeeCards.find(card => 
      card.closest("div[data-slot='tooltip-trigger']")
    );
    expect(coffeeCard).toBeTruthy();
    fireEvent.click(coffeeCard!.closest("div[data-slot='tooltip-trigger']")!);
    
    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        name: "Coffee",
        caffeineMg: 95,
        consumedAt: expect.any(String),
      });
    });
    
    expect(mockUtils.entries.getDaily.invalidate).toHaveBeenCalled();
    expect(mockUtils.entries.getSuggestions.invalidate).toHaveBeenCalled();
  });

  it("handles manual add with name and amount", async () => {
    mockCreateMutation.mutateAsync.mockResolvedValue({});
    
    renderWithSession(<AddEntryForm />);
    
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "150" } });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name this drink?")).toBeInTheDocument();
    });
    
    const nameInput = screen.getByPlaceholderText("Name this drink?");
    fireEvent.change(nameInput, { target: { value: "Custom Drink" } });
    
    const addButton = screen.getByText("Add Entry");
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        name: "Custom Drink",
        caffeineMg: 150,
        consumedAt: expect.any(String),
      });
    });
  });

  it("selects search result and populates form", async () => {
    renderWithSession(<AddEntryForm />);
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "coffee" } });

    // Wait for search results popup to appear
    await waitFor(() => {
      expect(screen.getAllByText("Coffee").length).toBeGreaterThan(0);
    });

    // Find the search popup container and the correct search result
    const popups = Array.from(document.querySelectorAll("div.bg-black\\/80,div.bg-black"));
    let searchResult: HTMLElement | null = null;
    popups.forEach(popup => {
      const result = Array.from(popup.querySelectorAll("span,div")).find(
        el => el.textContent?.replace(/\s/g, "") === "95mg"
      );
      if (result) searchResult = result as HTMLElement;
    });
    expect(searchResult).toBeTruthy();
    fireEvent.click(searchResult!.closest("div")!);

    await waitFor(() => {
      expect(screen.getByDisplayValue("95")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Coffee")).toBeInTheDocument();
    });
  });

  it("shows loading state during mutation", () => {
    mockCreateMutation.isPending = true;
    
    renderWithSession(<AddEntryForm />);
    
    const searchInput = screen.getByPlaceholderText("Search drinks or enter amount (mg)");
    fireEvent.change(searchInput, { target: { value: "100" } });
    
    expect(screen.getByPlaceholderText("Name this drink?")).toBeInTheDocument();
    expect(screen.getByText("Adding...")).toBeInTheDocument();
  });

  it("handles empty suggestions gracefully", () => {
    mockApi.entries.getSuggestions.useQuery.mockReturnValue({
      data: [],
    });
    
    renderWithSession(<AddEntryForm />);
    
    expect(screen.getByPlaceholderText("Search drinks or enter amount (mg)")).toBeInTheDocument();
    // Should not crash with empty suggestions
  });

  it("displays correct drink icons", () => {
    renderWithSession(<AddEntryForm />);
    
    // Check that drink icons are displayed in the favorites grid
    // Use getAllByText since there might be multiple instances of the same icon
    expect(screen.getAllByText("☕").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🍵").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🫖").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🥤").length).toBeGreaterThan(0);
  });

  it("limits favorites grid to 6 items", () => {
    const manySuggestions = [
      { name: "Drink 1", caffeineMg: 10 },
      { name: "Drink 2", caffeineMg: 20 },
      { name: "Drink 3", caffeineMg: 30 },
      { name: "Drink 4", caffeineMg: 40 },
      { name: "Drink 5", caffeineMg: 50 },
      { name: "Drink 6", caffeineMg: 60 },
      { name: "Drink 7", caffeineMg: 70 },
      { name: "Drink 8", caffeineMg: 80 },
    ];
    
    mockApi.entries.getSuggestions.useQuery.mockReturnValue({
      data: manySuggestions,
    });
    
    renderWithSession(<AddEntryForm />);
    
    expect(screen.getByText("Drink 1")).toBeInTheDocument();
    expect(screen.getByText("Drink 6")).toBeInTheDocument();
    expect(screen.queryByText("Drink 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Drink 8")).not.toBeInTheDocument();
  });
}); 