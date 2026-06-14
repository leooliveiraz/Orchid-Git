import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreatePRDialog from "../src/app/components/CreatePRDialog";
import { OrchidContext } from "../src/app/OrchidContext";

const mockGetCurrentBranch = jest.fn().mockResolvedValue("feature-branch");
const mockGetOriginUrl = jest.fn().mockResolvedValue("https://github.com/user/repo.git");
const mockCreatePR = jest.fn().mockResolvedValue({ ok: true, url: "https://github.com/user/repo/compare/main...feature-branch?expand=1" });

function renderCreatePRDialog(overrides = {}) {
  const refresh = jest.fn();
  window.api = {
    getCurrentBranch: mockGetCurrentBranch,
    getOriginUrl: mockGetOriginUrl,
    createPR: mockCreatePR,
    ...overrides.api,
  };

  return render(
    <OrchidContext.Provider value={{
      directory: "/test/repo",
      repoData: {
        branches: ["main", "develop", "feature-branch"],
        currentBranch: "feature-branch",
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
      ...overrides.context,
    }}>
      <CreatePRDialog onClose={overrides.onClose || (() => {})} />
    </OrchidContext.Provider>
  );
}

afterEach(() => {
  delete window.api;
  jest.clearAllMocks();
});

test("renders title and platform detection", async () => {
  renderCreatePRDialog();
  expect(screen.getByText("Create Pull Request")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText(/GitHub/)).toBeInTheDocument();
  });
});

test("loads current branch from API on mount", async () => {
  renderCreatePRDialog();
  await waitFor(() => {
    expect(screen.getByLabelText("Source branch")).toHaveValue("feature-branch");
  });
  expect(mockGetCurrentBranch).toHaveBeenCalledWith("/test/repo");
  expect(mockGetOriginUrl).toHaveBeenCalledWith("/test/repo");
});

test("shows warning when no remote is configured", async () => {
  renderCreatePRDialog({
    api: { getOriginUrl: jest.fn().mockResolvedValue("") },
  });
  await waitFor(() => {
    expect(screen.getByText(/não possui um remote/)).toBeInTheDocument();
  });
  expect(screen.getByRole("button", { name: /Open in Browser/i })).toBeDisabled();
});

test("calls createPR on submit and shows success", async () => {
  renderCreatePRDialog();
  await waitFor(() => {
    expect(screen.getByLabelText("Source branch")).toHaveValue("feature-branch");
  });

  fireEvent.change(screen.getByLabelText("Target branch"), { target: { value: "develop" } });
  fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "My PR title" } });
  fireEvent.click(screen.getByRole("button", { name: /Open in Browser/i }));

  await waitFor(() => {
    expect(mockCreatePR).toHaveBeenCalledWith("/test/repo", {
      headBranch: "feature-branch",
      baseBranch: "develop",
      title: "My PR title",
    });
  });

  await waitFor(() => {
    expect(screen.getByText(/Pull request page opened/)).toBeInTheDocument();
    expect(screen.getByText(/github\.com/)).toBeInTheDocument();
  });
});

test("disables submit button while loading", async () => {
  let resolveCreate;
  const createPromise = new Promise(r => { resolveCreate = r; });
  renderCreatePRDialog({
    api: { createPR: jest.fn().mockReturnValue(createPromise) },
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Source branch")).toHaveValue("feature-branch");
  });

  fireEvent.click(screen.getByRole("button", { name: /Open in Browser/i }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Opening/i })).toBeDisabled();
  });

  resolveCreate({ ok: true, url: "https://github.com/user/repo/compare/main...feature-branch?expand=1" });
});

test("shows error message when createPR fails", async () => {
  renderCreatePRDialog({
    api: { createPR: jest.fn().mockRejectedValue(new Error("No remote configured")) },
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Source branch")).toHaveValue("feature-branch");
  });

  fireEvent.click(screen.getByRole("button", { name: /Open in Browser/i }));

  await waitFor(() => {
    expect(screen.getByText(/No remote configured/)).toBeInTheDocument();
  });
});

test("uses main as default target branch", async () => {
  renderCreatePRDialog();
  await waitFor(() => {
    expect(screen.getByLabelText("Source branch")).toHaveValue("feature-branch");
  });

  fireEvent.click(screen.getByRole("button", { name: /Open in Browser/i }));

  await waitFor(() => {
    expect(mockCreatePR).toHaveBeenCalledWith("/test/repo", {
      headBranch: "feature-branch",
      baseBranch: "main",
      title: undefined,
    });
  });
});
