import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChangesPanel from "../src/app/components/ChangesPanel";

const mockStatus = [
  { type: "M", path: "src/file1.js", staged: true },
  { type: "M", path: "src/file2.js", staged: false },
];

beforeEach(() => {
  window.api = {
    getStatus: jest.fn().mockResolvedValue(mockStatus),
    stageFile: jest.fn().mockResolvedValue(""),
    unstageFile: jest.fn().mockResolvedValue(""),
    stageAll: jest.fn().mockResolvedValue(""),
    getDiff: jest.fn().mockResolvedValue("diff content"),
    getStagedDiff: jest.fn().mockResolvedValue("staged diff"),
    push: jest.fn().mockResolvedValue("done"),
    pull: jest.fn().mockResolvedValue("done"),
  };
});

afterEach(() => {
  delete window.api;
});

test("renders Push and Pull buttons", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(screen.getByText("Pull")).toBeInTheDocument();
  });
});

test("shows confirm modal on Push click", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Push"));
  });
  expect(screen.getByText("Push commits to the remote repository?")).toBeInTheDocument();
});

test("shows confirm modal on Pull click", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Pull"));
  });
  expect(screen.getByText("Pull latest changes from the remote repository?")).toBeInTheDocument();
});

test("calls api.push on confirm", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Push"));
  });
  await screen.findByText("Push commits to the remote repository?");
  const btns = screen.getAllByText("Push");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(window.api.push).toHaveBeenCalledWith("/repo");
  });
});

test("calls api.pull on confirm", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Pull"));
  });
  await screen.findByText("Pull latest changes from the remote repository?");
  const btns = screen.getAllByText("Pull");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(window.api.pull).toHaveBeenCalledWith("/repo");
  });
});

test("cancel closes confirm modal", async () => {
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Push"));
  });
  expect(screen.getByText("Push commits to the remote repository?")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByText("Push commits to the remote repository?")).not.toBeInTheDocument();
});

test("shows error when push fails", async () => {
  window.api.push.mockRejectedValue(new Error("No remote configured"));
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Push"));
  });
  await screen.findByText("Push commits to the remote repository?");
  const btns = screen.getAllByText("Push");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(screen.getByText("No remote configured")).toBeInTheDocument();
  });
});

test("shows error when pull fails", async () => {
  window.api.pull.mockRejectedValue(new Error("Merge conflict"));
  render(<ChangesPanel directory="/repo" />);
  await waitFor(() => {
    fireEvent.click(screen.getByText("Pull"));
  });
  await screen.findByText("Pull latest changes from the remote repository?");
  const btns = screen.getAllByText("Pull");
  fireEvent.click(btns[btns.length - 1]);
  await waitFor(() => {
    expect(screen.getByText("Merge conflict")).toBeInTheDocument();
  });
});
