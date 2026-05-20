import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CloneDialog from "../src/app/components/CloneDialog";

beforeEach(() => {
  window.api = {
    clone: jest.fn().mockResolvedValue("done"),
    selectDirectory: jest.fn().mockResolvedValue({ canceled: false, filePaths: ["/home/user/projects/myrepo"] }),
  };
});

afterEach(() => {
  delete window.api;
});

test("renders title and fields", () => {
  render(<CloneDialog onClose={() => {}} />);
  expect(screen.getByText("Clone Repository")).toBeInTheDocument();
  expect(screen.getByText("Repository URL")).toBeInTheDocument();
  expect(screen.getByText("Destination directory")).toBeInTheDocument();
});

test("has inputs and buttons", () => {
  render(<CloneDialog onClose={() => {}} />);
  expect(screen.getByPlaceholderText("https://github.com/user/repo.git")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("/path/to/destination")).toBeInTheDocument();
  expect(screen.getByText("Browse")).toBeInTheDocument();
  expect(screen.getByText("Cancel")).toBeInTheDocument();
  expect(screen.getByText("Clone")).toBeInTheDocument();
});

test("clone button disabled when fields empty", () => {
  render(<CloneDialog onClose={() => {}} />);
  expect(screen.getByText("Clone")).toBeDisabled();
});

test("clone button enabled when fields filled", () => {
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("https://github.com/user/repo.git"), { target: { value: "https://github.com/user/repo.git" } });
  fireEvent.change(screen.getByPlaceholderText("/path/to/destination"), { target: { value: "/home/user/projects/myrepo" } });
  expect(screen.getByText("Clone")).not.toBeDisabled();
});

test("calls api.clone with url and dest", async () => {
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("https://github.com/user/repo.git"), { target: { value: "https://github.com/user/repo.git" } });
  fireEvent.change(screen.getByPlaceholderText("/path/to/destination"), { target: { value: "/home/user/projects/myrepo" } });
  fireEvent.click(screen.getByText("Clone"));
  await waitFor(() => {
    expect(window.api.clone).toHaveBeenCalledWith("https://github.com/user/repo.git", "/home/user/projects/myrepo");
  });
});

test("shows Cloning... while cloning", async () => {
  window.api.clone.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("https://github.com/user/repo.git"), { target: { value: "https://github.com/user/repo.git" } });
  fireEvent.change(screen.getByPlaceholderText("/path/to/destination"), { target: { value: "/home/user/projects/myrepo" } });
  fireEvent.click(screen.getByText("Clone"));
  expect(screen.getByText("Cloning...")).toBeInTheDocument();
});

test("shows error when clone fails", async () => {
  window.api.clone.mockRejectedValue(new Error("Repository not found"));
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("https://github.com/user/repo.git"), { target: { value: "https://github.com/user/repo.git" } });
  fireEvent.change(screen.getByPlaceholderText("/path/to/destination"), { target: { value: "/home/user/projects/myrepo" } });
  fireEvent.click(screen.getByText("Clone"));
  await waitFor(() => {
    expect(screen.getByText("Repository not found")).toBeInTheDocument();
  });
});

test("shows success message after clone", async () => {
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("https://github.com/user/repo.git"), { target: { value: "https://github.com/user/repo.git" } });
  fireEvent.change(screen.getByPlaceholderText("/path/to/destination"), { target: { value: "/home/user/projects/myrepo" } });
  fireEvent.click(screen.getByText("Clone"));
  await waitFor(() => {
    expect(screen.getByText(/Repository cloned/)).toBeInTheDocument();
  });
});

test("calls onClose on Cancel", () => {
  const onClose = jest.fn();
  render(<CloneDialog onClose={onClose} />);
  fireEvent.click(screen.getByText("Cancel"));
  expect(onClose).toHaveBeenCalled();
});

test("calls api.selectDirectory on Browse click", async () => {
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.click(screen.getByText("Browse"));
  await waitFor(() => {
    expect(window.api.selectDirectory).toHaveBeenCalledWith("");
  });
});

test("fills destination after Browse", async () => {
  render(<CloneDialog onClose={() => {}} />);
  fireEvent.click(screen.getByText("Browse"));
  await waitFor(() => {
    expect(screen.getByPlaceholderText("/path/to/destination").value).toBe("/home/user/projects/myrepo");
  });
});
