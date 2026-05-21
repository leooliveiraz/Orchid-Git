import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RebaseDialog from "../src/app/components/RebaseDialog";
import { OrchidContext } from "../src/app/OrchidContext";

const mockCommits = [
  { hash: "a1b2c3", message: "Fix login bug" },
  { hash: "d4e5f6", message: "Add new feature" },
  { hash: "g7h8i9", message: "Refactor module" },
];

function renderRebaseDialog(overrides = {}) {
  const refresh = jest.fn();
  window.api = {
    getRebaseCommits: jest.fn().mockResolvedValue(mockCommits),
    executeRebase: jest.fn().mockResolvedValue("done"),
    ...overrides.api,
  };

  const result = render(
    <OrchidContext.Provider value={{
      directory: "/test/repo",
      repoData: {
        branches: ["main", "develop"],
        currentBranch: "feature/x",
      },
      refresh,
      setDirectory: () => {},
      themeMode: "light",
      toggleTheme: () => {},
      setRepoData: () => {},
      menuOpen: true,
      setMenuOpen: () => {},
      refreshKey: 0,
      recentDirs: [],
    }}>
      <RebaseDialog onClose={() => {}} />
    </OrchidContext.Provider>
  );

  return { ...result, refresh, api: window.api };
}

afterEach(() => {
  delete window.api;
});

test("renders title and current branch", () => {
  renderRebaseDialog();
  expect(screen.getByText("Interactive rebase")).toBeInTheDocument();
  expect(screen.getByText(/feature\/x/)).toBeInTheDocument();
});

test("shows branch selector with options", () => {
  renderRebaseDialog();
  expect(screen.getByLabelText("Rebase onto")).toBeInTheDocument();
});

test("shows hint before selecting a branch", () => {
  renderRebaseDialog();
  expect(screen.getByText(/Select a target branch/)).toBeInTheDocument();
});

test("calls getRebaseCommits when branch selected", async () => {
  const { api } = renderRebaseDialog();
  const selector = screen.getByLabelText("Rebase onto");

  fireEvent.mouseDown(selector);
  fireEvent.click(screen.getByText("develop"));

  await waitFor(() => {
    expect(api.getRebaseCommits).toHaveBeenCalledWith("/test/repo", "develop");
  });
});

test("displays commits after loading", async () => {
  renderRebaseDialog();
  const selector = screen.getByLabelText("Rebase onto");

  fireEvent.mouseDown(selector);
  fireEvent.click(screen.getByText("develop"));

  await waitFor(() => {
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Add new feature")).toBeInTheDocument();
    expect(screen.getByText("Refactor module")).toBeInTheDocument();
  });
});

test("shows start rebase button", () => {
  renderRebaseDialog();
  expect(screen.getByText("Start rebase")).toBeInTheDocument();
});

test("shows commit hashes in monospace", async () => {
  renderRebaseDialog();
  fireEvent.mouseDown(screen.getByLabelText("Rebase onto"));
  fireEvent.click(screen.getByText("develop"));

  await waitFor(() => {
    expect(screen.getByText("a1b2c3")).toBeInTheDocument();
    expect(screen.getByText("d4e5f6")).toBeInTheDocument();
  });
});
