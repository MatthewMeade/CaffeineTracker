import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { DailyTimeline } from "../../src/app/_components/DailyTimeline";
import { type EntryApiResponse } from "../../src/types/api";

describe("DailyTimeline", () => {
  const mockEntries: EntryApiResponse[] = [
    {
      id: "1",
      name: "Morning Coffee",
      caffeine_mg: 95,
      consumed_at: new Date(2024, 0, 1, 8, 30).toISOString(),
      drink_id: null,
    },
    {
      id: "2",
      name: "Green Tea",
      caffeine_mg: 25,
      consumed_at: new Date(2024, 0, 1, 10, 15).toISOString(),
      drink_id: null,
    },
    {
      id: "3",
      name: "Energy Drink",
      caffeine_mg: 80,
      consumed_at: new Date(2024, 0, 1, 14, 20).toISOString(),
      drink_id: null,
    },
    {
      id: "4",
      name: "Espresso",
      caffeine_mg: 63,
      consumed_at: new Date(2024, 0, 1, 18, 45).toISOString(),
      drink_id: null,
    },
  ];

  it("renders empty state when no entries", () => {
    render(<DailyTimeline entries={[]} />);
    expect(screen.getByText("Add a drink to start tracking your timeline")).toBeInTheDocument();
  });

  it("groups entries by time of day and displays them", () => {
    render(<DailyTimeline entries={mockEntries} />);
    expect(screen.getByText("Today's Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Espresso/)).toBeInTheDocument();
    expect(screen.getByText(/4 entries today/)).toBeInTheDocument();
  });
}); 