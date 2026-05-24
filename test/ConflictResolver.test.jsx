import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConflictResolver from "../src/app/components/ConflictResolver";
import { OrchidContext } from "../src/app/OrchidContext";

const mockBlocks = [
  { index: 0, ours: "return oldValue;", theirs: "return newValue;", start: 0, end: 60 },
  { index: 1, ours: 'console.log("debug");', theirs: "// removed debug", start: 60, end: 120 },
];

function renderResolver(overrides = {}) {
  const refresh = jest.fn();
  const onRefresh = jest.fn();
  window.api = {
    getConflictBlocks: jest.fn().mockResolvedValue({ blocks: mockBlocks }),
    resolveConflictBlocks: jest.fn().mockResolvedValue("ok"),
    resolveFile: jest.fn().mockResolvedValue(""),
    continueMerge: jest.fn().mockResolvedValue(""),
    abortMerge: jest.fn().mockResolvedValue(""),
    ...overrides.api,
  };

  const result = render(
    <OrchidContext.Provider value={{
      directory: "/test/repo",
      repoData: null,
      refresh,
      setDirectory: () => {},
      themeMode: "light",
      toggleTheme: () => {},
      setRepoData: () => {},
      menuOpen: true,
      setMenuOpen: () => {},
    }}>
      <ConflictResolver directory="/test/repo" conflictedFiles={["src/file1.js"]} onRefresh={onRefresh} />
    </OrchidContext.Provider>
  );

  return { ...result, refresh, onRefresh, api: window.api };
}

afterEach(() => {
  delete window.api;
});

test("renders conflict title and file count", () => {
  renderResolver();
  expect(screen.getByText("Merge Conflicts")).toBeInTheDocument();
  expect(screen.getByText("1 file(s)")).toBeInTheDocument();
});

test("shows file name in monospace", async () => {
  renderResolver();
  await waitFor(() => {
    expect(screen.getByText("src/file1.js")).toBeInTheDocument();
  });
});

test("shows conflict blocks after loading", async () => {
  renderResolver();
  await waitFor(() => {
    expect(screen.getByText(/return oldValue/)).toBeInTheDocument();
    expect(screen.getByText(/return newValue/)).toBeInTheDocument();
    expect(screen.getByText(/console\.log/)).toBeInTheDocument();
    expect(screen.getByText(/removed debug/)).toBeInTheDocument();
  });
});

test("shows Keep ours, Keep theirs, Keep both buttons for each block", async () => {
  renderResolver();
  await waitFor(() => {
    const oursBtns = screen.getAllByText("Keep ours");
    expect(oursBtns.length).toBe(2);
    const theirsBtns = screen.getAllByText("Keep theirs");
    expect(theirsBtns.length).toBe(2);
    const bothBtns = screen.getAllByText("Keep both");
    expect(bothBtns.length).toBe(2);
  });
});

test("shows Continue and Abort buttons", () => {
  renderResolver();
  expect(screen.getByText("Continue")).toBeInTheDocument();
  expect(screen.getByText("Abort merge")).toBeInTheDocument();
});

test("Continue disabled when files remain", () => {
  renderResolver();
  expect(screen.getByText("Continue")).toBeDisabled();
});

test("shows success alert when no files", () => {
  render(
    <OrchidContext.Provider value={{
      directory: "/test/repo", repoData: null, refresh: () => {},
      setDirectory: () => {}, themeMode: "light", toggleTheme: () => {},
      setRepoData: () => {}, menuOpen: true, setMenuOpen: () => {},
    }}>
      <ConflictResolver directory="/test/repo" conflictedFiles={[]} onRefresh={() => {}} />
    </OrchidContext.Provider>
  );
  expect(screen.getByText(/All conflicts resolved/)).toBeInTheDocument();
  expect(screen.getByText("Continue")).not.toBeDisabled();
});

test("calls continueMerge on Continue click when no conflicts", async () => {
  window.api = {
    continueMerge: jest.fn().mockResolvedValue(""),
  };
  render(
    <OrchidContext.Provider value={{
      directory: "/test/repo", repoData: null, refresh: () => {},
      setDirectory: () => {}, themeMode: "light", toggleTheme: () => {},
      setRepoData: () => {}, menuOpen: true, setMenuOpen: () => {},
    }}>
      <ConflictResolver directory="/test/repo" conflictedFiles={[]} onRefresh={() => {}} />
    </OrchidContext.Provider>
  );

  fireEvent.click(screen.getByText("Continue"));
  await waitFor(() => {
    expect(window.api.continueMerge).toHaveBeenCalledWith("/test/repo");
  });
});

test("calls abortMerge on Abort click", async () => {
  const { api } = renderResolver();
  fireEvent.click(screen.getByText("Abort merge"));
  await waitFor(() => {
    expect(api.abortMerge).toHaveBeenCalledWith("/test/repo");
  });
});

test("keep ours button marks block as selected", async () => {
  renderResolver();
  await waitFor(() => {
    expect(screen.getByText(/return oldValue/)).toBeInTheDocument();
  });
  const btn = screen.getAllByText("Keep ours")[0];
  fireEvent.click(btn);
  await waitFor(() => {
    expect(btn.closest("button")).toHaveClass("MuiButton-contained");
  });
});

test("calls getConflictBlocks for each file", async () => {
  const { api } = renderResolver();
  await waitFor(() => {
    expect(api.getConflictBlocks).toHaveBeenCalledWith("/test/repo", "src/file1.js");
  });
});
