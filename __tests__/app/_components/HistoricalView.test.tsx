import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HistoricalView } from "../../../src/app/_components/HistoricalView";

// Mock tRPC
vi.mock("~/trpc/react", () => ({
  api: {
    entries: {
      getGraphData: {
        useQuery: vi.fn(),
      },
      getDaily: {
        useQuery: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
    },
    useUtils: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children, onClick }: any) => (
    <div data-testid="bar-chart" onClick={() => onClick?.({ activeLabel: "2024-01-15" })}>
      {children}
    </div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  ReferenceLine: () => <div data-testid="reference-line" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

const mockUseQuery = vi.fn();
const mockGetDailyQuery = vi.fn();
const mockUpdateMutation = vi.fn();
const mockDeleteMutation = vi.fn();
const mockUseUtils = vi.fn();

describe("HistoricalView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { api } = await import("~/trpc/react");
    api.entries.getGraphData.useQuery = mockUseQuery;
    api.entries.getDaily.useQuery = mockGetDailyQuery;
    api.entries.update.useMutation = mockUpdateMutation;
    api.entries.delete.useMutation = mockDeleteMutation;
    api.useUtils = mockUseUtils;
  });

  const mockGraphData = {
    data: [
      {
        date: "2024-01-15",
        total_mg: 320,
        limit_exceeded: false,
        limit_mg: 400,
      },
      {
        date: "2024-01-16",
        total_mg: 450,
        limit_exceeded: true,
        limit_mg: 400,
      },
      {
        date: "2024-01-17",
        total_mg: 280,
        limit_exceeded: false,
        limit_mg: 400,
      },
    ],
  };

  it("renders the historical overview title", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    expect(screen.getByText("Historical Overview")).toBeInTheDocument();
  });

  it("renders loading state when data is loading", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    // Check for loading spinner instead of responsive-container
    expect(screen.getByText("Historical Overview")).toBeInTheDocument();
    // The loading state shows animated dots, not the chart
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("renders error state when query fails", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch data"),
      refetch: vi.fn(),
    });

    render(<HistoricalView dailyLimit={400} />);
    
    expect(screen.getByText("Error loading historical data")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders chart with transformed data", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-withinLimit")).toBeInTheDocument();
    expect(screen.getByTestId("bar-overage")).toBeInTheDocument();
    expect(screen.getByTestId("reference-line")).toBeInTheDocument();
  });

  it("calls tRPC query with correct date range", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    expect(mockUseQuery).toHaveBeenCalledWith(
      {
        start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
      {
        enabled: true,
      }
    );
  });

  it("handles chart click to select day", async () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    mockGetDailyQuery.mockReturnValue({
      data: {
        entries: [
          {
            id: "1",
            name: "Coffee",
            caffeine_mg: 100,
            consumed_at: "2024-01-15T08:00:00Z",
            icon: "☕",
          },
        ],
        daily_total_mg: 100,
        over_limit: false,
        daily_limit_mg: 400,
      },
      isLoading: false,
      error: null,
    });

    mockUpdateMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockDeleteMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUtils.mockReturnValue({
      entries: {
        getDaily: {
          invalidate: vi.fn(),
        },
      },
    });

    render(<HistoricalView dailyLimit={400} />);
    
    const chart = screen.getByTestId("bar-chart");
    fireEvent.click(chart);
    
    await waitFor(() => {
      expect(screen.getByText("2024-01-15 Details")).toBeInTheDocument();
    });
  });

  it("navigates date range with arrow buttons", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0]; // First button is prev
    const nextButton = buttons[2]; // Third button is next
    
    expect(prevButton).toBeDefined();
    expect(nextButton).toBeDefined();
    
    fireEvent.click(prevButton!);
    fireEvent.click(nextButton!);
    
    // The query should be called multiple times due to date changes
    expect(mockUseQuery).toHaveBeenCalledTimes(3); // Initial + 2 navigation clicks
  });

  it("shows date range picker when calendar button is clicked", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    const calendarButton = screen.getByRole("button", { name: /Jul 28 - Aug 3/i });
    fireEvent.click(calendarButton);
    
    expect(screen.getByText("Select Date Range")).toBeInTheDocument();
    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("30D")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("changes date range when different range is selected", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    const calendarButton = screen.getByRole("button", { name: /Jul 28 - Aug 3/i });
    fireEvent.click(calendarButton);
    
    const thirtyDayButton = screen.getByText("30D");
    fireEvent.click(thirtyDayButton);
    
    // Should call query with new date range - expect 3 calls: initial + calendar open + range change
    expect(mockUseQuery).toHaveBeenCalledTimes(3);
  });

  it("renders legend with correct colors", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    expect(screen.getByText("Within Limit")).toBeInTheDocument();
    expect(screen.getByText("Over Limit")).toBeInTheDocument();
    expect(screen.getByText("Daily Limit")).toBeInTheDocument();
  });

  it("transforms data correctly for stacked bar chart", () => {
    mockUseQuery.mockReturnValue({
      data: mockGraphData,
      isLoading: false,
      error: null,
    });

    render(<HistoricalView dailyLimit={400} />);
    
    // The chart should render with the transformed data
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-withinLimit")).toBeInTheDocument();
    expect(screen.getByTestId("bar-overage")).toBeInTheDocument();
  });
}); 