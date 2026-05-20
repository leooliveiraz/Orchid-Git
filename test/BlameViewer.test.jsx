import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BlameViewer from "../src/app/components/BlameViewer";

const mockBlame = [
  { hash: "a1b2c3d4", author: "John Doe", date: "1/15/2024", lineNum: 1, content: "const x = 1;" },
  { hash: "e5f6g7h8", author: "Jane Doe", date: "1/14/2024", lineNum: 2, content: "const y = 2;" },
  { hash: "a1b2c3d4", author: "John Doe", date: "1/13/2024", lineNum: 3, content: "function hello() {" },
  { hash: "00000000", author: "Not Committed Yet", date: "", lineNum: 4, content: "  return 42;" },
];

test("renders file name in title", () => {
  render(<BlameViewer fileName="src/file.js" blameData={mockBlame} onClose={() => {}} />);
  expect(screen.getByText("src/file.js")).toBeInTheDocument();
});

test("calls onClose when close button clicked", () => {
  const onClose = jest.fn();
  render(<BlameViewer fileName="src/file.js" blameData={mockBlame} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test("renders column headers", () => {
  render(<BlameViewer fileName="file.js" blameData={mockBlame} onClose={() => {}} />);
  expect(screen.getByText("Line")).toBeInTheDocument();
  expect(screen.getByText("Hash")).toBeInTheDocument();
  expect(screen.getByText("Author")).toBeInTheDocument();
  expect(screen.getByText("Date")).toBeInTheDocument();
  expect(screen.getByText("Content")).toBeInTheDocument();
});

test("renders all blame rows", () => {
  render(<BlameViewer fileName="file.js" blameData={mockBlame} onClose={() => {}} />);
  expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  expect(screen.getByText("const y = 2;")).toBeInTheDocument();
  expect(screen.getByText("function hello() {")).toBeInTheDocument();
  expect(screen.getByText("return 42;")).toBeInTheDocument();
});

test("renders line numbers and authors", () => {
  render(<BlameViewer fileName="file.js" blameData={mockBlame} onClose={() => {}} />);
  expect(screen.getByText("1")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getAllByText("John Doe").length).toBe(2);
  expect(screen.getByText("Jane Doe")).toBeInTheDocument();
});

test("renders empty state when no data", () => {
  render(<BlameViewer fileName="file.js" blameData={[]} onClose={() => {}} />);
  expect(screen.getByText("Line")).toBeInTheDocument();
});

test("renders hashes in monospace", () => {
  render(<BlameViewer fileName="file.js" blameData={mockBlame} onClose={() => {}} />);
  const hashes = screen.getAllByText("a1b2c3d4");
  expect(hashes.length).toBe(2);
  expect(hashes[0].tagName).toBe("TD");
});
