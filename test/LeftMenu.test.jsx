import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LeftMenu from "../src/app/components/LeftMenu";
import { OrchidContext } from "../src/app/OrchidContext";

const mockRepoData = {
  branches: ["main", "develop"],
  remoteBranches: ["origin/main"],
  tags: ["v1.0", "v2.0"],
  stashList: [
    { id: "stash@{0}", message: "WIP: fix bug" },
    { id: "stash@{1}", message: "WIP: refactor" },
  ],
  currentBranch: "main",
};

function renderLeftMenu(overrides = {}) {
  const api = {
    deleteBranch: jest.fn().mockResolvedValue(""),
    deleteTag: jest.fn().mockResolvedValue(""),
    stashDrop: jest.fn().mockResolvedValue(""),
    ...overrides.api,
  };

  window.api = api;

  const refresh = jest.fn();

  const result = render(
    <OrchidContext.Provider value={{
      directory: "/test/repo",
      repoData: mockRepoData,
      refresh,
      setDirectory: () => {},
      themeMode: "light",
      toggleTheme: () => {},
      setRepoData: () => {},
      menuOpen: true,
      setMenuOpen: () => {},
    }}>
      <LeftMenu open />
    </OrchidContext.Provider>
  );

  return { ...result, api, refresh };
}

afterEach(() => {
  delete window.api;
});

test("renders branches, tags and stashes", () => {
  renderLeftMenu();
  expect(screen.getByText("main")).toBeInTheDocument();
  expect(screen.getByText("develop")).toBeInTheDocument();
  expect(screen.getByText("v1.0")).toBeInTheDocument();
});

test("clicking delete on branch shows confirm dialog", async () => {
  renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const devDelete = deletes.find(d => d.closest("li")?.textContent?.includes("develop"));
  fireEvent.click(devDelete);

  await waitFor(() => {
    expect(screen.getByRole("dialog")).toHaveTextContent(/delete/i);
    expect(screen.getByRole("dialog")).toHaveTextContent(/develop/i);
  });
});

test("clicking delete on tag shows confirm dialog", () => {
  renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const tagDelete = deletes.find(d => d.closest("li")?.textContent?.includes("v2.0"));
  fireEvent.click(tagDelete);

  expect(screen.getByRole("dialog")).toHaveTextContent(/delete/i);
  expect(screen.getByRole("dialog")).toHaveTextContent(/v2.0/i);
});

test("clicking delete on stash shows confirm dialog", () => {
  renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const stashDelete = deletes.find(d => d.closest("li")?.textContent?.includes("stash@{1}"));
  fireEvent.click(stashDelete);

  expect(screen.getByRole("dialog")).toHaveTextContent(/delete/i);
  expect(screen.getByRole("dialog")).toHaveTextContent(/stash@{1}/i);
});

test("cancel closes confirm dialog", async () => {
  renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  fireEvent.click(deletes[0]);

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();
  fireEvent.click(screen.getByText("Cancel"));

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("confirm delete calls api.deleteBranch", async () => {
  const { api } = renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const devDelete = deletes.find(d => d.closest("li")?.textContent?.includes("develop"));
  fireEvent.click(devDelete);

  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("Delete"));

  await waitFor(() => {
    expect(api.deleteBranch).toHaveBeenCalledWith("/test/repo", "develop");
  });
});

test("confirm delete tag calls api.deleteTag", async () => {
  const { api } = renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const tagDelete = deletes.find(d => d.closest("li")?.textContent?.includes("v2.0"));
  fireEvent.click(tagDelete);

  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("Delete"));

  await waitFor(() => {
    expect(api.deleteTag).toHaveBeenCalledWith("/test/repo", "v2.0");
  });
});

test("confirm delete stash calls api.stashDrop", async () => {
  const { api } = renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  const stashDelete = deletes.find(d => d.closest("li")?.textContent?.includes("stash@{1}"));
  fireEvent.click(stashDelete);

  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("Delete"));

  await waitFor(() => {
    expect(api.stashDrop).toHaveBeenCalledWith("/test/repo", "stash@{1}");
  });
});

test("no delete icon on active branch", () => {
  renderLeftMenu();
  const mainItems = screen.getAllByText("main");
  for (const item of mainItems) {
    const li = item.closest("li");
    if (li) {
      const secondary = li.querySelector('[class*="MuiListItemSecondaryAction"]');
      expect(secondary).toBeFalsy();
    }
  }
});

test("delete icons count matches non-active branches + tags + stashes", () => {
  renderLeftMenu();
  const deletes = screen.getAllByTestId("DeleteIcon");
  expect(deletes.length).toBe(5);
});
