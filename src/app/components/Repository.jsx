import React, { useEffect, useState } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import SearchText from "./SearchText.jsx";

const COLOR_LIST = [
  "#2D3AC9",
  "#B041FD",
  "#FD63CE",
  "#FD3C2F",
  "#FC9E25",
  "#FAFF90",
  "#3B8C33",
];

export default function Repository({ repositoryDirectory }) {
  const [commitList, setCommitList] = useState([]);
  const [longestDepth, setLongestDepth] = useState(1);

  useEffect(() => {
    const useTopoOrder = true;
    const allBranches = true;
    const commitLimit = 10000;
    window.api
      .getRepositoryCommits(
        repositoryDirectory,
        useTopoOrder,
        allBranches,
        commitLimit
      )
      .then((result) => {
        const commits = configureCommitList(result);
        let longestDepthCommit = 0;
        let maxDepth = 0;

        commits.forEach((commit, index) => {
          commit.branchQuantity = 0;
          commit.index = index;
          if (commit.sonsNumber === undefined) commit.sonsNumber = 0;
          if (commit.sons === undefined) commit.sons = [];
          defineDadIndexAndDistance(commit, index, commits);
        });
        const branchMap = {};

        commits.forEach((element, index) => {
          //   defineBranch(element, index, commits);
          //   defineParentBranch(element, index, commits);
          //   if (element.merge) defineMergeBranch(element, index, commits);
          maxDepth = defineDepth(element, index, commits, maxDepth, branchMap);
          //   if (maxDepth > longestDepth) {
          //     longestDepthCommit = maxDepth;
          //   }
        });
        // commits.forEach((element, index) => {
        //   defineMerge(element, index, commits);
        // });

        setCommitList(commits);
        setLongestDepth(longestDepthCommit);
      });
  }, [repositoryDirectory]);

  useEffect(() => {
    if (commitList) {
      console.log("commitList", commitList);
    }
  }, [commitList]);

  function configureCommitList(result) {
    const commitStringArray = result.split("!@#!@#!@#");
    const commitList = [];
    commitStringArray.forEach((commit) => {
      try {
        if (commit.trim()) {
          const arrayMessage = commit.split('"*()*()*()');
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

  function defineDepth(commit, index, commitList, maxDepth, branchMap) {
    const shouldPrint = ["c252374"].includes(commit.commit);
    if (index === 0) {
      commit.depth = 0;
      initializeBranchMap(index, branchMap);
      branchMap[`${index}`][`${commit.depth}`] = commit.commit;
    } else {
      const nextCommit = commitList[index - 1];
      const beforeCommit = commitList[index + 1];
      const parent = getParentElement(commit, commitList);
      const mergeParent = getMergeParentElement(commit, commitList);

      //define commit depth
      if (nextCommit.parent === commit.commit) {
        if (commit.depth === undefined) {
          commit.depth = nextCommit.depth;
        }
        if (commit.sonsNumber > 1 || commit.sonsMergeNumber > 0) {
          const minDepthSon = getMinDepthAllSons(commit);
          if (minDepthSon !== null) {
            commit.depth = minDepthSon;
          }
        }
      } else {
        if (commit.sonsNumber === 0) {
          if (commit.sonsMergeNumber > 0) {
            const sonMerge = commit.sonsMerge[0];
            if (maxDepth - sonMerge.depth > 1) {
              for (
                let tryDepth = sonMerge.depth;
                tryDepth < maxDepth;
                tryDepth++
              ) {
                if (!branchMap[`${index}`][`${tryDepth}`]) {
                  commit.depth = tryDepth;
                  break;
                }
              }
            } else {
              commit.depth = maxDepth;
            }
          } else {
            maxDepth++;
            commit.depth = maxDepth;
          }
        } else if (commit.sonsNumber === 1) {
          commit.depth = commit.sons[0].depth;
        } else if (commit.sonsNumber > 1) {
          const minDepthSon = getMinDepthAllSons(commit);
          if (minDepthSon !== null) {
            commit.depth = minDepthSon;
          }
          //alert(commit.commit)
        }
      }
      if (commit.sonsNumber > 1) {
        maxDepth = maxDepth - (commit.sons.length - 1);
      }
      if (commit.sonsMergeNumber > 0) {
        for (const son of commit.sonsMerge) {
          if (son.depth > commit.depth) {
            maxDepth = maxDepth - 1;
          }
        }
        // maxDepth = maxDepth - commit.sonsMergeNumber;
      }
      commit.maxDepth = maxDepth;

      initializeBranchMap(index, branchMap);
      for (
        let countToDad = 0;
        countToDad < commit.parentDistance;
        countToDad++
      ) {
        initializeBranchMap(index + countToDad, branchMap);
        branchMap[`${index + countToDad}`][`${commit.depth}`] = commit.commit;
      }

      if (commit.merge !== undefined) {
        if (mergeParent.sonsNumber === 0) {
          maxDepth++;
        } else if (mergeParent.sonsNumber > 0) {
          //verifica se existe filho com index mais baixo que o commit atual
          const sonsWithLowerIndex = mergeParent.sons.filter(
            (son) => son.index < commit.index
          );
          if (sonsWithLowerIndex.length > 0) {
          } else {
            maxDepth++;
          }
        }
      }
    }
    return maxDepth;
  }

  function getDepthOfSonWithBiggestDistance(commit) {
    let biggestDistance = 0;
    let sonD = null;
    let isMerge = false;
    if (commit.sonsNumber > 0) {
      for (const son of commit.sons) {
        if (son.dadDistance > biggestDistance) {
          biggestDistance = son.dadDistance;
          sonD = son;
          isMerge = false;
        }
      }
    }
    if (commit.sonsMergeNumber > 0) {
      for (const son of commit.sonsMerge) {
        if (son.merge.parentDistance > biggestDistance) {
          biggestDistance = son.merge.parentDistance;
          sonD = son;
          isMerge = true;
        }
      }
    }
    if (isMerge) {
      return sonD.depth + 1;
    } else {
      return sonD.depth;
    }
  }

  function initializeBranchMap(index, branchMap) {
    if (branchMap && !branchMap[`${index}`]) {
      branchMap[`${index}`] = {};
    }
  }
  function printIf(shouldPrint) {
    if (shouldPrint) {
      for (let index = 1; index < arguments.length; index++) {
        const argument = arguments[index];
        console.log(argument);
      }
    }
  }

  function defineBranch(commit, index, commitList) {
    if (commit.decoration) {
      const decorationArray = commit.decoration
        .replace("(", "")
        .replace(")", "")
        .split(",");

      const branch = decorationArray.find((text) => text.includes("origin"));
      const branchTrimed = branch?.trim();
      commit.branch = branchTrimed;
    }
  }

  function defineParentBranch(commit, index, commitList) {
    const parent = getParentElement(commit, commitList);
    if (parent && !parent.branch) {
      parent.branch = commit.branch;
    }

    if (parent && parent.decoration) {
      const branch = parent.decoration.replace("(", "").replace(")", "").trim();
      parent.branch = branch;
    }
  }

  function defineMergeBranch(commit, index, commitList) {
    const mergeParent = getMergeParentElement(commit, commitList);
    if (mergeParent && !mergeParent.branch) {
      mergeParent.branch = commit.branch;
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

  function getMergeParentElement(commit, commitList) {
    if (commit.merge) {
      return commitList[commit.merge.parentIndex];
    } else {
      return null;
    }
  }

  function getMinDepthSon(commit) {
    if (commit?.sons) {
      let depth = Number.MAX_SAFE_INTEGER;
      for (const son of commit.sons) {
        const sonDepth = son.depth;
        if (depth === null && sonDepth !== undefined && sonDepth !== null) {
          depth = son.depth;
        }
        if (sonDepth !== undefined && sonDepth !== null && sonDepth < depth) {
          depth = sonDepth;
        }
      }
      return depth;
    }
    return null;
  }
  function getMinDepthMergeSon(commit) {
    if (commit?.sonsMerge) {
      let depth = Number.MAX_SAFE_INTEGER;
      for (const son of commit.sonsMerge) {
        const sonDepth = son.depth;
        if (depth === null && sonDepth !== undefined && sonDepth !== null) {
          depth = son.depth;
        }
        if (sonDepth !== undefined && sonDepth !== null && sonDepth < depth) {
          depth = sonDepth;
        }
      }
      return depth;
    }
    return null;
  }

  function getMinDepthAllSons(commit) {
    const minDepthSon = getMinDepthSon(commit);
    const minDepthMergeSon = getMinDepthMergeSon(commit);
    if (minDepthSon !== null) {
      if (minDepthMergeSon !== null) {
        if (minDepthSon <= minDepthMergeSon) {
          return minDepthSon;
        } else {
          return minDepthMergeSon + 1;
        }
      } else {
        return minDepthSon;
      }
    } else if (minDepthMergeSon !== null) {
      return minDepthMergeSon + 1;
    } else {
      return null;
    }
  }

  function getMaxDepthSon(commit) {
    if (commit?.sons) {
      let depth = 0;
      for (const son of commit.sons) {
        const sonDepth = son.depth;
        if (sonDepth > depth) {
          depth = sonDepth;
        }
      }
      return depth;
    }
    return null;
  }

  function defineDadIndexAndDistance(commit, index, commitList) {
    if (commit.parent.includes(" ")) {
      defineDadInMerge(commit, index, commitList);
    } else {
      defineDad(commit, index, commitList);
    }
    const parent = getParentElement(commit, commitList);
    const mergeParent = getMergeParentElement(commit, commitList);
    if (parent) {
      addSonToCommit(parent, commit);
    }
    if (mergeParent) {
      addMergeSonToCommit(mergeParent, commit);
    }
  }

  function addSonToCommit(parent, commit) {
    if (parent && !parent.sons) {
      parent.sons = [];
    }
    if (parent && parent.sons) {
      parent.sons.push(commit);
    }
    parent.sonsNumber = parent.sons.length;
  }

  function addMergeSonToCommit(parent, commit) {
    if (parent && !parent.sonsMerge) {
      parent.sonsMerge = [];
    }
    if (parent && parent.sonsMerge) {
      parent.sonsMerge.push(commit);
    }
    parent.sonsMergeNumber = parent.sonsMerge.length;
  }

  function defineDad(commit, index, list) {
    const parentEquals = (item) => item.commit === commit.parent;
    const dadIndex = list.findNextIndex(parentEquals, index);
    commit.parentIndex = dadIndex;
    commit.parentDistance = dadIndex - index;
  }

  function defineDadInMerge(commit, index, list) {
    const parentList = commit.parent.split(" ");
    let parentEquals = (item) => item.commit === parentList[0];
    let parentEquals2 = (item) => item.commit === parentList[1];
    const parentIndex = list.findNextIndex(parentEquals, index);
    const mergeParentIndex = list.findNextIndex(parentEquals2, index);

    commit.merge = {
      hash: parentList[1],
      parent:list[mergeParentIndex],
      parentIndex: mergeParentIndex,
      parentDistance: mergeParentIndex - index,
    };
    commit.parentIndex = parentIndex;
    commit.parentDistance = parentIndex - index;
  }

  return (
    <>
      <h1>{repositoryDirectory}</h1>
      <SearchText></SearchText>
      <CommitTable
        commitList={commitList}
        longestDepth={longestDepth}
      ></CommitTable>
    </>
  );
}
