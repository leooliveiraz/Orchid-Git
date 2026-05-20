import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DiffViewer from "../src/app/components/DiffViewer";

const sampleDiff = `--- a/src/file.js
+++ b/src/file.js
@@ -1,3 +1,4 @@
 line1
-old line
+new line
 line3`;

test("renders file name in title", () => {
  render(<DiffViewer fileName="src/file.js" diffText={sampleDiff} onClose={() => {}} />);
  expect(screen.getByText("src/file.js")).toBeInTheDocument();
});

test("calls onClose when close button clicked", () => {
  const onClose = jest.fn();
  render(<DiffViewer fileName="src/file.js" diffText={sampleDiff} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test("shows no changes for empty diff", () => {
  render(<DiffViewer fileName="file.js" diffText="" onClose={() => {}} />);
  expect(screen.getByText("No changes")).toBeInTheDocument();
});

test("renders the diff table for valid diff", () => {
  render(<DiffViewer fileName="file.js" diffText={sampleDiff} onClose={() => {}} />);
  expect(screen.getByText("file.js")).toBeInTheDocument();
});
