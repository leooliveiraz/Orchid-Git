import React, { useEffect, useState } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";

export default function Repository({ repositoryDirectory }) {
  const [commitList, setCommitList] = useState([]);
  const [longestDepth, setLongestDepth] = useState(1);

  useEffect(() => {
    window.api.getRepositoryCommits(repositoryDirectory).then((result) => {
      const commits = configureCommitList(result);
      let longestDepthCommit = 0;
      let maxDepth = 0;
      commits.forEach((element, index) => {
        defineDadIndexAndDistance(element, index, commits);
        defineBranch(element, index, commits);
        defineParentBranch(element, index, commits);
        if (element.merge) defineMergeBranch(element, index, commits);
        maxDepth = defineDepth(element, index, commits, maxDepth);
        if (maxDepth > longestDepth) {
          longestDepthCommit = maxDepth;
        }
      });
      commits.forEach((element, index) => {
        defineMerge(element, index, commits);
      });

      setCommitList(commits);
      setLongestDepth(longestDepthCommit);
    });
  }, [repositoryDirectory]);

  useEffect(() => {
    if (commitList) {
      console.log(commitList);
    }
  }, [commitList]);

  function configureCommitList(result) {
    const commitStringArray = result.split("!@#!@#!@#");
    const commitList = [];
    commitStringArray.forEach((element) => {
      try {
        if (element.trim()) {
          const arrayMessage = element.split('"*()*()*()');
          let message = arrayMessage[1]?.replaceAll('"', '\\"');
          const newElement = `${arrayMessage[0]}\"${message}\"${arrayMessage[2]}`;
          const json = JSON.parse(newElement);
          commitList.push(json);
        }
      } catch (e) {
        console.log(e);
        alert("erro ao configurar commit");
      }
    });
    // const sortedList = commitList.sort((a,b) => new Date(b.date) - new Date(a.date))
    return commitList;
  }

  function defineMerge(commit, index, commitList) {
    if (commit.merge) {
      const mergeParent = getMergeParentElement(commit, commitList);
      if (commit.depth < mergeParent.depth) {
        commit.merge.depthDistance = mergeParent.depth - commit.depth;
      }
      if (commit.depth > mergeParent.depth) {
        commit.merge.depthDistance = mergeParent.depth - commit.depth;
      }
    } else {
      const parent = getParentElement(commit, commitList);

      if (parent) {
        if (commit.depth < parent.depth) {
          commit.depthDistance = parent.depth - commit.depth;
        }
        if (commit.depth > parent.depth) {
          commit.depthDistance = parent.depth - commit.depth;
        }
      }
    }
  }

  function defineDepth(element, index, commitList, maxDepth) {
    if (index === 0) {
      element.depth = 0;
    }
    if (index > 0) {
      const nextCommit = commitList[index - 1];
      //define element depth
      if (element.decoration) {
        if (element.commit !== nextCommit?.parent) {
          maxDepth++;
          element.depth = maxDepth;
        } else {
          element.depth = nextCommit.depth;
        }
      } else {
        if (element.commit === nextCommit?.parent) {
          element.depth = nextCommit.depth;
        } else {
          const parent = getParentElement(element, commitList);
          if(!parent.sonsDepth) {
            parent.sonsDepth = [element.depth]
          }
        }
      }
    }

    //define parent depth
    const parent = getParentElement(element, commitList);
    if (parent) {
      if (parent.sons?.length > 1) {
        maxDepth--;
      }
      if (parent.branch !== element.branch) {
        parent.depth =
          parent.sons?.length > 1 ? element.depth - 1 : element.depth;
      } else {
        parent.depth =
          parent.sons?.length > 1 ? parent.depth - 1 : element.depth;
      }
    }

    //define merge parent depth
    const mergeParent = getMergeParentElement(element, commitList);
    if (mergeParent) {
      if (
        mergeParent?.branch === element.branch &&
        parent?.branch === element.branch
      ) {
        if (!element.decoration) {
          if (mergeParent.depth === null || mergeParent.depth == undefined) {
            // thats why dept has been defined before
            maxDepth++;
            mergeParent.depth = maxDepth;
          }
        }
      }
    }
    element.maxDepth = maxDepth;
    return maxDepth;
  }

  function defineBranch(element, index, commitList) {
    if (element.decoration) {
      const decorationArray = element.decoration
        .replace("(", "")
        .replace(")", "")
        .split(",");

      const branch = decorationArray.find((text) => text.includes("origin"));
      const branchTrimed = branch?.trim();
      element.branch = branchTrimed;
    }
  }

  function defineParentBranch(element, index, commitList) {
    const parent = getParentElement(element, commitList);
    if (parent && !parent.branch) {
      parent.branch = element.branch;
    }

    if (parent && parent.decoration) {
      const branch = parent.decoration.replace("(", "").replace(")", "").trim();
      parent.branch = branch;
    }
  }

  function defineMergeBranch(element, index, commitList) {
    const mergeParent = getMergeParentElement(element, commitList);
    if (mergeParent && !mergeParent.branch) {
      mergeParent.branch = element.branch;
    }
    if (mergeParent?.decoration) {
      const branch = mergeParent?.decoration
        .replace("(", "")
        .replace(")", "")
        .trim();
      mergeParent.branch = branch;
    }
  }

  function getParentElement(element, commitList) {
    return commitList[element.parentIndex];
  }

  function getMergeParentElement(element, commitList) {
    if (element.merge) {
      return commitList[element.merge.parentIndex];
    } else {
      return null;
    }
  }

  function defineDadIndexAndDistance(element, index, commitList) {
    if (element.parent.includes(" ")) {
      defineDadInMerge(element, index, commitList);
    } else {
      defineDad(element, index, commitList);
    }
    const parent = getParentElement(element, commitList);
    if (parent) {
      addSonToCommit(parent, element);
    }
  }

  function addSonToCommit(parent, commit) {
    if (!parent.sons) {
      parent.sons = [];
    }
    if(parent?.sons){
      parent.sons.push(commit);
    }
  }

  function defineDad(element, index, list) {
    const parentEquals = (item) => item.commit === element.parent;
    const dadIndex = list.findNextIndex(parentEquals, index);
    element.parentIndex = dadIndex;
    element.parentDistance = dadIndex - index;
  }

  function defineDadInMerge(element, index, list) {
    const parentList = element.parent.split(" ");
    let parentEquals = (item) => item.commit === parentList[0];
    let parentEquals2 = (item) => item.commit === parentList[1];
    const parentIndex = list.findNextIndex(parentEquals, index);
    const mergeParentIndex = list.findNextIndex(parentEquals2, index);
    element.merge = {
      parent: parentList[1],
      parentIndex: mergeParentIndex,
      parentDistance: mergeParentIndex - index,
    };
    element.parentIndex = parentIndex;
    element.parentDistance = parentIndex - index;
  }

  return (
    <>
      <h1>{repositoryDirectory}</h1>
      <CommitTable
        commitList={commitList}
        longestDepth={longestDepth}
      ></CommitTable>
    </>
  );
}
