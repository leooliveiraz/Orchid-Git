function parseStatusOutput(output) {
  if (!output || !output.trim()) return [];
  return output.split("\n").filter(Boolean).flatMap(line => {
    if (line.length < 3) return [];
    const status = line.substring(0, 2);
    const x = line[0];
    const y = line[1];
    let path = line.substring(3).trim().replace(/\/$/, "");
    const conflicted = x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D");

    if (conflicted) {
      return [{ type: status, path, staged: false, conflicted: true }];
    }

    const isRename = x === "R";
    if (isRename) {
      const [, newPath] = path.split(" -> ");
      path = newPath || path;
    }

    const hasStaged = x !== " " && x !== "?";
    const hasUnstaged = y !== " " && y !== "?";

    if (x === "?" && y === "?") {
      return [{ type: "??", path, staged: false }];
    }

    const entries = [];
    if (hasStaged) {
      entries.push({ type: isRename ? "R" : x, path, staged: true });
    }
    if (hasUnstaged) {
      entries.push({ type: y, path, staged: false });
    }
    return entries;
  });
}

function parseStashList(output) {
  if (!output || !output.trim()) return [];
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [id, ...msg] = line.split("||");
    return { id, message: msg.join("||") };
  });
}

module.exports = { parseStatusOutput, parseStashList };