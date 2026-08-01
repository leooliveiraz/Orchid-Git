const { parseStatusOutput, parseStashList } = require("../src/git");

describe("parseStatusOutput", () => {
  test("parses staged modified", () => {
    expect(parseStatusOutput("M  file.txt")).toEqual([
      { type: "M", path: "file.txt", staged: true },
    ]);
  });

  test("parses unstaged modified", () => {
    expect(parseStatusOutput(" M file.txt")).toEqual([
      { type: "M", path: "file.txt", staged: false },
    ]);
  });

  test("parses staged added", () => {
    expect(parseStatusOutput("A  new.txt")).toEqual([
      { type: "A", path: "new.txt", staged: true },
    ]);
  });

  test("parses staged deleted", () => {
    expect(parseStatusOutput("D  deleted.txt")).toEqual([
      { type: "D", path: "deleted.txt", staged: true },
    ]);
  });

  test("parses untracked", () => {
    expect(parseStatusOutput("?? new.txt")).toEqual([
      { type: "??", path: "new.txt", staged: false },
    ]);
  });

  test("parses both staged and unstaged (MM)", () => {
    const result = parseStatusOutput("MM file.txt");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "M", path: "file.txt", staged: true });
    expect(result[1]).toEqual({ type: "M", path: "file.txt", staged: false });
  });

  test("parses staged added with unstaged changes (AM)", () => {
    expect(parseStatusOutput("AM file.txt")).toEqual([
      { type: "A", path: "file.txt", staged: true },
      { type: "M", path: "file.txt", staged: false },
    ]);
  });

  test("parses renamed with unstaged changes (RM)", () => {
    expect(parseStatusOutput("RM old.js -> new.js")).toEqual([
      { type: "R", path: "new.js", staged: true },
      { type: "M", path: "new.js", staged: false },
    ]);
  });

  test("parses renamed", () => {
    expect(parseStatusOutput("R  old.js -> new.js")).toEqual([
      { type: "R", path: "new.js", staged: true },
    ]);
  });

  test("parses multiple files", () => {
    const output = "M  staged.txt\n M unstaged.txt\n?? new.txt";
    const result = parseStatusOutput(output);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "M", path: "staged.txt", staged: true });
    expect(result[1]).toEqual({ type: "M", path: "unstaged.txt", staged: false });
    expect(result[2]).toEqual({ type: "??", path: "new.txt", staged: false });
  });

  test("returns empty array for empty input", () => {
    expect(parseStatusOutput("")).toEqual([]);
    expect(parseStatusOutput(null)).toEqual([]);
    expect(parseStatusOutput(undefined)).toEqual([]);
  });
});

describe("parseStashList", () => {
  test("parses stash list", () => {
    const output = "stash@{0}||WIP on main: abc123 fix bug\nstash@{1}||On dev: add feature";
    const result = parseStashList(output);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "stash@{0}", message: "WIP on main: abc123 fix bug" });
    expect(result[1]).toEqual({ id: "stash@{1}", message: "On dev: add feature" });
  });

  test("returns empty array for empty input", () => {
    expect(parseStashList("")).toEqual([]);
    expect(parseStashList(null)).toEqual([]);
  });
});
