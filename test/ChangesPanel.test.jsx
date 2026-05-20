import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChangesPanel from "../src/app/components/ChangesPanel";

const mockStatus = [
  { type: "M", path: "src/file1.js", staged: true },
  { type: "M", path: "src/file2.js", staged: false },
  { type: "??", path: "new.txt", staged: false },
];

beforeEach(() => {
  window.api = {
    getStatus: jest.fn().mockResolvedValue(mockStatus),
    stageFile: jest.fn().mockResolvedValue(""),
    unstageFile: jest.fn().mockResolvedValue(""),
    stageAll: jest.fn().mockResolvedValue(""),
    getDiff: jest.fn().mockResolvedValue("diff content"),
    getStagedDiff: jest.fn().mockResolvedValue("staged diff content"),
    getBlame: jest.fn().mockResolvedValue([{ hash: "abc", author: "A", date: "", lineNum: 1, content: "code" }]),
  };
});

afterEach(() => {
  delete window.api;
});

test("renders status count and sections", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    expect(screen.getByText(/3 file\(s\)/)).toBeInTheDocument();
  });

  expect(screen.getByText("Staged (1)")).toBeInTheDocument();
  expect(screen.getByText("Changes (2)")).toBeInTheDocument();
  expect(screen.getByText("src/file1.js")).toBeInTheDocument();
  expect(screen.getByText("src/file2.js")).toBeInTheDocument();
  expect(screen.getByText("new.txt")).toBeInTheDocument();
});

test("displays status type badges", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    const badges = screen.getAllByText("M");
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  expect(screen.getByText("??")).toBeInTheDocument();
});

test("calls getStatus on mount", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    expect(window.api.getStatus).toHaveBeenCalledWith("/test/repo");
  });
});

test("shows empty messages when no files", async () => {
  window.api.getStatus.mockResolvedValue([]);
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    expect(screen.getByText("No staged files")).toBeInTheDocument();
    expect(screen.getByText("No changes")).toBeInTheDocument();
  });
});

test("shows Refresh and Stage All buttons", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    expect(screen.getByText("Refresh")).toBeInTheDocument();
    expect(screen.getByText("Stage All")).toBeInTheDocument();
  });
});

test("has Stage/Unstage buttons for each file", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    expect(screen.getByText("Unstage")).toBeInTheDocument();
  });

  const stageButtons = screen.getAllByText("Stage");
  expect(stageButtons.length).toBe(2);
});

test("has Diff buttons for each file", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    const diffButtons = screen.getAllByText("Diff");
    expect(diffButtons.length).toBe(3);
  });
});

test("has Blame buttons for each file", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    const blameButtons = screen.getAllByText("Blame");
    expect(blameButtons.length).toBe(3);
  });
});

test("clicking Blame calls getBlame API", async () => {
  render(<ChangesPanel directory="/test/repo" />);

  await waitFor(() => {
    const blameButtons = screen.getAllByText("Blame");
    fireEvent.click(blameButtons[0]);
  });

  await waitFor(() => {
    expect(window.api.getBlame).toHaveBeenCalled();
  });
});
