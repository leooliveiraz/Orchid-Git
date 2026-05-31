import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConflictResolver from "../src/app/components/ConflictResolver";
import { OrchidContext } from "../src/app/OrchidContext";

function renderResolver(overrides = {}) {
  const refresh = jest.fn();
  const onRefresh = jest.fn();

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

  return { ...result, refresh, onRefresh };
}

test("renders conflict title and file count", () => {
  renderResolver();
  expect(screen.getByText("Merge Conflicts")).toBeInTheDocument();
  expect(screen.getByText("1 file(s)")).toBeInTheDocument();
});

test("shows file name in monospace", () => {
  renderResolver();
  expect(screen.getByText("src/file1.js")).toBeInTheDocument();
});

test("shows Open conflict resolver button", () => {
  renderResolver();
  const btns = screen.getAllByText("Open conflict resolver");
  expect(btns.length).toBeGreaterThanOrEqual(1);
});

test("shows Resolve button for each file", () => {
  renderResolver();
  const resolveBtns = screen.getAllByText("Resolve");
  expect(resolveBtns.length).toBeGreaterThanOrEqual(1);
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
});
