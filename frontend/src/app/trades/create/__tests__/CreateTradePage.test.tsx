import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTradePage from "../page";

jest.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidEd25519PublicKey: (address: string) =>
      address.startsWith("G") && address.length >= 40,
  },
}));

describe("CreateTradePage step gating", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("blocks incomplete details and advances after valid details", async () => {
    const user = userEvent.setup();
    render(<CreateTradePage />);

    const continueButton = screen.getByRole("button", { name: /continue to negotiation/i });
    expect(continueButton).toBeDisabled();
    expect(screen.queryByLabelText(/delivery window/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/commodity/i), "Maize");
    await user.type(screen.getByLabelText(/quantity/i), "500");
    await user.type(screen.getByLabelText(/price per unit/i), "450");
    await user.type(
      screen.getByPlaceholderText(/g\.\.\./i),
      "GBRP4ZDXSS6NZPMTVNE7DZ47JNV7OFPJMIVG4FDCMNZP7CHH4656YEXI",
    );

    expect(continueButton).toBeEnabled();
    await user.click(continueButton);

    expect(screen.getByLabelText(/delivery window/i)).toBeInTheDocument();
  });
});