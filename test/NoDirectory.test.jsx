import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NoDirectory from "../src/app/components/NoDirectory";
import { OrchidContext } from "../src/app/OrchidContext";

function renderNoDirectory(overrides = {}) {
  const setDirectory = jest.fn();
  const recentDirs = overrides.recentDirs || [];

  const result = render(
    <OrchidContext.Provider value={{
      directory: "",
      setDirectory,
      themeMode: "light",
      toggleTheme: () => {},
      repoData: null,
      setRepoData: () => {},
      menuOpen: true,
      setMenuOpen: () => {},
      refresh: () => {},
      refreshKey: 0,
      recentDirs,
    }}>
      <NoDirectory />
    </OrchidContext.Provider>
  );

  return { ...result, setDirectory };
}

afterEach(() => {
  delete window.api;
});

test("renders welcome title and buttons", () => {
  renderNoDirectory();
  expect(screen.getByText("Orchid Git")).toBeInTheDocument();
  expect(screen.getByText("Open Repository")).toBeInTheDocument();
  expect(screen.getByText("Clone Repository")).toBeInTheDocument();
});

test("shows recent directories when provided", () => {
  renderNoDirectory({ recentDirs: ["/path/to/proj1", "/path/to/proj2"] });
  expect(screen.getByText("/path/to/proj1")).toBeInTheDocument();
  expect(screen.getByText("/path/to/proj2")).toBeInTheDocument();
});

test("clicking recent directory calls setDirectory", () => {
  const { setDirectory } = renderNoDirectory({ recentDirs: ["/path/to/my-repo"] });
  fireEvent.click(screen.getByText("/path/to/my-repo"));
  expect(setDirectory).toHaveBeenCalledWith("/path/to/my-repo");
});

test("does not show recent section when recentDirs is empty", () => {
  renderNoDirectory({ recentDirs: [] });
  expect(screen.queryByText("Recent")).not.toBeInTheDocument();
});
