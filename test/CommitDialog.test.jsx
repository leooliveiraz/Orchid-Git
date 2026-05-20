import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CommitDialog from "../src/app/components/CommitDialog";

const mockStaged = [
  { type: "M", path: "src/file1.js", staged: true },
  { type: "A", path: "src/new.js", staged: true },
];

beforeEach(() => {
  window.api = {
    commit: jest.fn().mockResolvedValue("done"),
  };
});

afterEach(() => {
  delete window.api;
});

test("renders title and staged files", () => {
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={() => {}} />);
  expect(screen.getByText("Commit changes")).toBeInTheDocument();
  expect(screen.getByText(/Staged files \(2\)/)).toBeInTheDocument();
  expect(screen.getByText("src/file1.js")).toBeInTheDocument();
  expect(screen.getByText("src/new.js")).toBeInTheDocument();
});

test("has a textarea and buttons", () => {
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={() => {}} />);
  expect(screen.getByPlaceholderText("Commit message")).toBeInTheDocument();
  expect(screen.getByText("Cancel")).toBeInTheDocument();
  expect(screen.getByText("Commit")).toBeInTheDocument();
});

test("commit button is disabled when message is empty", () => {
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={() => {}} />);
  expect(screen.getByText("Commit")).toBeDisabled();
});

test("commit button is enabled when message is typed", () => {
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("Commit message"), { target: { value: "fix: bug" } });
  expect(screen.getByText("Commit")).not.toBeDisabled();
});

test("calls api.commit with directory and message", async () => {
  const onClose = jest.fn();
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={onClose} />);
  fireEvent.change(screen.getByPlaceholderText("Commit message"), { target: { value: "fix: bug" } });
  fireEvent.click(screen.getByText("Commit"));
  await waitFor(() => {
    expect(window.api.commit).toHaveBeenCalledWith("/repo", "fix: bug");
  });
});

test("calls onClose with true on success", async () => {
  const onClose = jest.fn();
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={onClose} />);
  fireEvent.change(screen.getByPlaceholderText("Commit message"), { target: { value: "fix" } });
  fireEvent.click(screen.getByText("Commit"));
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledWith(true);
  });
});

test("calls onClose with false on Cancel", () => {
  const onClose = jest.fn();
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={onClose} />);
  fireEvent.click(screen.getByText("Cancel"));
  expect(onClose).toHaveBeenCalledWith(false);
});

test("shows error when commit fails", async () => {
  window.api.commit.mockRejectedValue(new Error("merge conflict"));
  const onClose = jest.fn();
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={onClose} />);
  fireEvent.change(screen.getByPlaceholderText("Commit message"), { target: { value: "fix" } });
  fireEvent.click(screen.getByText("Commit"));
  await waitFor(() => {
    expect(screen.getByText("merge conflict")).toBeInTheDocument();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test("shows Committing... while committing", async () => {
  window.api.commit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
  render(<CommitDialog directory="/repo" stagedFiles={mockStaged} onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("Commit message"), { target: { value: "fix" } });
  fireEvent.click(screen.getByText("Commit"));
  expect(screen.getByText("Committing...")).toBeInTheDocument();
});
