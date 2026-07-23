import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Audio Whisperer", () => {
  it("starts with narrator choices before the manuscript", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Create an audiobook" })).toBeInTheDocument();
    expect(screen.getByText("Private by design")).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("");
    expect(screen.queryByLabelText("Model version")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Language")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Voice")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Book title")).not.toBeInTheDocument();

    const narrator = screen.getByRole("heading", { name: "Narrator setup" });
    const manuscript = screen.getByRole("heading", { name: "Manuscript" });
    expect(narrator.compareDocumentPosition(manuscript) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate audiobook" })).toBeDisabled();
  });

  it("reveals every Kokoro language and filters voices after configuration", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Model"), "kokoro");
    expect(screen.getByLabelText("Model version")).toBeInTheDocument();
    expect(screen.queryByLabelText("Language")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Model version"), "kokoro-v1-q8");

    expect(screen.getByLabelText("Language")).toBeInTheDocument();
    expect(screen.getByLabelText("Language").querySelectorAll("option")).toHaveLength(10);
    await user.selectOptions(screen.getByLabelText("Language"), "es");
    expect(screen.getByLabelText("Voice")).toBeInTheDocument();
    expect(screen.getByLabelText("Voice").querySelectorAll("option")).toHaveLength(4);
    expect(screen.getByRole("option", { name: "Dora · Female" })).toBeInTheDocument();
  });

  it("prepares the single pasted-text field as sentence-sized segments", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Model"), "kokoro");
    await user.selectOptions(screen.getByLabelText("Model version"), "kokoro-v1-q8");
    await user.selectOptions(screen.getByLabelText("Language"), "en-us");
    await user.type(
      screen.getByLabelText("Book text"),
      "A small lamp burned beside the window. Outside, the town had gone quiet.",
    );

    expect(screen.getByText("1 segment ready")).toBeInTheDocument();
  });

  it("labels Chatterbox as English-only in the browser", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Model"), "chatterbox-ml");

    expect(screen.getByText(/Chatterbox currently supports English only in the browser/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Model version"), "chatterbox-en-v1-wasm");
    expect(screen.getByLabelText("Language").querySelectorAll("option")).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Language"), "en");
    await user.selectOptions(screen.getByLabelText("Voice"), "default-reference");
    expect(screen.getByRole("button", { name: "Download narrator" })).toBeEnabled();
  });
});
