function parseStatusOutput(output) {
  if (!output || !output.trim()) return [];
  return output.split("\n").filter(Boolean).map(line => {
    if (line.length < 3) return null;
    const status = line.substring(0, 2);
    const x = line[0];
    const y = line[1];
    let path = line.substring(3).trim().replace(/\/$/, "");
    const conflicted = x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D");

    if (conflicted) {
      return { type: status, path, staged: false, conflicted: true };
    }
    if (x === "R" && y === " ") {
      const [, newPath] = path.split(" -> ");
      return { type: "R", path: newPath, staged: true };
    }
    if (x !== " " && x !== "?") {
      return { type: x, path, staged: true };
    }
    if (y !== " " && y !== "?") {
      return { type: y, path, staged: false };
    }
    if (x === "?" && y === "?") {
      return { type: "??", path, staged: false };
    }
    return null;
  }).filter(Boolean);
}

function parseStashList(output) {
  if (!output || !output.trim()) return [];
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [id, ...msg] = line.split("||");
    return { id, message: msg.join("||") };
  });
}

module.exports = { parseStatusOutput, parseStashList };
