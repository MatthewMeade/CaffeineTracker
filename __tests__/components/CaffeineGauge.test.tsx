import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { CaffeineGauge } from "../../src/app/_components/CaffeineGauge";

describe("CaffeineGauge", () => {
  it("renders the total caffeine and remaining when under limit", () => {
    render(<CaffeineGauge totalCaffeine={100} dailyLimit={200} />);
    expect(screen.getByText("100mg")).toBeInTheDocument();
    expect(screen.getByText("100mg remaining")).toBeInTheDocument();
  });

  it("shows 'Limit Reached' and overage when over limit", () => {
    render(<CaffeineGauge totalCaffeine={250} dailyLimit={200} />);
    expect(screen.getByText("Limit Reached")).toBeInTheDocument();
    expect(screen.getByText("+50mg")).toBeInTheDocument();
  });

  it("shows 'No daily limit set' when dailyLimit is null", () => {
    render(<CaffeineGauge totalCaffeine={80} dailyLimit={null} />);
    expect(screen.getByText("80mg")).toBeInTheDocument();
    expect(screen.getByText("No daily limit set")).toBeInTheDocument();
  });
}); 