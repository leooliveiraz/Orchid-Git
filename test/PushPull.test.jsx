import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AppMenu from "../src/app/components/AppMenu";
import { OrchidContext } from "../src/app/OrchidContext";

function renderAppMenu() {
  const refresh = jest.fn();
  window.api = {
    push: jest.fn().mockResolvedValue("done"),
    pull: jest.fn().mockResolvedValue("done"),
    fetch: jest.fn().mockResolvedValue("done"),
  };

  const result = render(
    <OrchidContext.Provider value={{
      directory: "/test/repo",
      setDirectory: () => {},
      themeMode: "light",
      toggleTheme: () => {},
      repoData: null,
      setRepoData: () => {},
      menuOpen: true,
      setMenuOpen: () => {},
      refresh,
      refreshKey: 0,
      recentDirs: [],
    }}>
      <AppMenu onToggleMenu={() => {}} />
    </OrchidContext.Provider>
  );

  return { ...result, api: window.api, refresh };
}

afterEach(() => {
  delete window.api;
});

test("renders Push, Pull and Fetch buttons", () => {
  renderAppMenu();
  expect(screen.getByLabelText("Push")).toBeInTheDocument();
  expect(screen.getByLabelText("Pull")).toBeInTheDocument();
  expect(screen.getByLabelText("Fetch")).toBeInTheDocument();
});

test("shows confirm modal on Push click", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Push"));
  expect(screen.getByText(/Push commits to the remote repository/)).toBeInTheDocument();
});

test("shows confirm modal on Pull click", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Pull"));
  expect(screen.getByText(/Pull latest changes from the remote repository/)).toBeInTheDocument();
});

test("calls api.push on confirm", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Push"));
  await screen.findByText(/Push commits/);
  const btns = screen.getAllByText("Push");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(window.api.push).toHaveBeenCalledWith("/test/repo", true);
  });
});

test("calls api.pull on confirm", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Pull"));
  await screen.findByText(/Pull latest changes/);
  const btns = screen.getAllByText("Pull");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(window.api.pull).toHaveBeenCalledWith("/test/repo");
  });
});

test("cancel closes confirm modal", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Push"));
  expect(screen.getByText(/Push commits/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Cancel"));
  await waitFor(() => {
    expect(screen.queryByText(/Push commits/)).not.toBeInTheDocument();
  });
});

test("shows error when push fails", async () => {
  const { api } = renderAppMenu();
  api.push.mockRejectedValue(new Error("No remote configured"));
  fireEvent.click(screen.getByLabelText("Push"));
  await screen.findByText(/Push commits/);
  const btns = screen.getAllByText("Push");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(screen.getByText("No remote configured")).toBeInTheDocument();
  });
});

test("shows error when pull fails", async () => {
  const { api } = renderAppMenu();
  api.pull.mockRejectedValue(new Error("Merge conflict"));
  fireEvent.click(screen.getByLabelText("Pull"));
  await screen.findByText(/Pull latest changes/);
  const btns = screen.getAllByText("Pull");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(screen.getByText("Merge conflict")).toBeInTheDocument();
  });
});

test("calls api.fetch on Fetch click", async () => {
  renderAppMenu();
  fireEvent.click(screen.getByLabelText("Fetch"));
  await waitFor(() => {
    expect(window.api.fetch).toHaveBeenCalledWith("/test/repo");
  });
});
