const { parseRemoteUrl, detectProvider, buildPullRequestUrl } = require("../src/app/utils/providerDetector");

describe("parseRemoteUrl", () => {
  test("parses HTTPS GitHub URL", () => {
    expect(parseRemoteUrl("https://github.com/owner/repo.git")).toEqual({
      host: "github.com", owner: "owner", repo: "repo", protocol: "https",
    });
  });

  test("parses HTTPS GitHub URL without .git", () => {
    expect(parseRemoteUrl("https://github.com/owner/repo")).toEqual({
      host: "github.com", owner: "owner", repo: "repo", protocol: "https",
    });
  });

  test("parses SSH GitHub URL", () => {
    expect(parseRemoteUrl("git@github.com:owner/repo.git")).toEqual({
      host: "github.com", owner: "owner", repo: "repo", protocol: "ssh",
    });
  });

  test("parses HTTPS GitLab URL", () => {
    expect(parseRemoteUrl("https://gitlab.com/group/project.git")).toEqual({
      host: "gitlab.com", owner: "group", repo: "project", protocol: "https",
    });
  });

  test("parses SSH GitLab URL", () => {
    expect(parseRemoteUrl("git@gitlab.com:group/project.git")).toEqual({
      host: "gitlab.com", owner: "group", repo: "project", protocol: "ssh",
    });
  });

  test("parses Bitbucket HTTPS URL", () => {
    expect(parseRemoteUrl("https://bitbucket.org/owner/repo.git")).toEqual({
      host: "bitbucket.org", owner: "owner", repo: "repo", protocol: "https",
    });
  });

  test("parses Azure DevOps HTTPS URL", () => {
    expect(parseRemoteUrl("https://dev.azure.com/myorg/myproject/_git/myrepo")).toEqual({
      host: "dev.azure.com", owner: "myorg", repo: "myproject/_git/myrepo", protocol: "https",
    });
  });

  test("parses Git protocol URL", () => {
    expect(parseRemoteUrl("git://github.com/owner/repo.git")).toEqual({
      host: "github.com", owner: "owner", repo: "repo", protocol: "git",
    });
  });

  test("returns null for empty string", () => {
    expect(parseRemoteUrl("")).toBeNull();
  });

  test("returns null for null", () => {
    expect(parseRemoteUrl(null)).toBeNull();
  });

  test("returns null for local file path", () => {
    expect(parseRemoteUrl("C:/Users/project")).toBeNull();
  });

  test("returns null for local path with forward slashes", () => {
    expect(parseRemoteUrl("/home/user/project")).toBeNull();
  });

  test("returns null for invalid URL", () => {
    expect(parseRemoteUrl("not-a-url")).toBeNull();
  });

  test("strips username from HTTPS URL", () => {
    expect(parseRemoteUrl("https://user@bitbucket.org/workspace/repo.git")).toEqual({
      host: "bitbucket.org", owner: "workspace", repo: "repo", protocol: "https",
    });
  });

  test("strips username with colon from HTTPS URL", () => {
    expect(parseRemoteUrl("https://user:pass@bitbucket.org/workspace/repo.git")).toEqual({
      host: "bitbucket.org", owner: "workspace", repo: "repo", protocol: "https",
    });
  });

  test("strips username from Azure DevOps HTTPS URL", () => {
    expect(parseRemoteUrl("https://user@dev.azure.com/org/project/_git/repo.git")).toEqual({
      host: "dev.azure.com", owner: "org", repo: "project/_git/repo", protocol: "https",
    });
  });
});

describe("detectProvider", () => {
  test("detects GitHub", () => {
    expect(detectProvider({ host: "github.com" })).toBe("github");
  });

  test("detects GitLab cloud", () => {
    expect(detectProvider({ host: "gitlab.com" })).toBe("gitlab");
  });

  test("detects self-hosted GitLab", () => {
    expect(detectProvider({ host: "gitlab.mycompany.com" })).toBe("gitlab");
  });

  test("detects Bitbucket", () => {
    expect(detectProvider({ host: "bitbucket.org" })).toBe("bitbucket");
  });

  test("detects Azure DevOps", () => {
    expect(detectProvider({ host: "dev.azure.com" })).toBe("azure-devops");
  });

  test("detects Gitea", () => {
    expect(detectProvider({ host: "gitea.example.com" })).toBe("gitea");
  });

  test("detects Gogs", () => {
    expect(detectProvider({ host: "git.gogs.io" })).toBe("gitea");
  });

  test("returns generic for unknown host", () => {
    expect(detectProvider({ host: "git.my-company.io" })).toBe("generic");
  });

  test("returns unknown for null", () => {
    expect(detectProvider(null)).toBe("unknown");
  });
});

describe("buildPullRequestUrl", () => {
  test("builds GitHub PR URL", () => {
    const url = buildPullRequestUrl("https://github.com/user/repo.git", "feature", "main");
    expect(url).toBe("https://github.com/user/repo/compare/main...feature?expand=1");
  });

  test("builds GitHub PR URL with default base branch", () => {
    const url = buildPullRequestUrl("https://github.com/user/repo.git", "feature");
    expect(url).toBe("https://github.com/user/repo/compare/main...feature?expand=1");
  });

  test("builds GitHub PR URL from SSH remote", () => {
    const url = buildPullRequestUrl("git@github.com:user/repo.git", "fix-bug", "develop");
    expect(url).toBe("https://github.com/user/repo/compare/develop...fix-bug?expand=1");
  });

  test("builds GitLab MR URL", () => {
    const url = buildPullRequestUrl("https://gitlab.com/group/project.git", "feature", "main");
    expect(url).toBe("https://gitlab.com/group/project/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature&merge_request%5Btarget_branch%5D=main");
  });

  test("builds GitLab MR URL from SSH remote", () => {
    const url = buildPullRequestUrl("git@gitlab.com:group/project.git", "feature", "main");
    expect(url).toBe("https://gitlab.com/group/project/-/merge_requests/new?merge_request%5Bsource_branch%5D=feature&merge_request%5Btarget_branch%5D=main");
  });

  test("builds Bitbucket PR URL", () => {
    const url = buildPullRequestUrl("https://bitbucket.org/team/app.git", "feature", "main");
    expect(url).toBe("https://bitbucket.org/team/app/pull-requests/new?source=feature&dest=main");
  });

  test("builds Bitbucket PR URL with username in remote", () => {
    const url = buildPullRequestUrl("https://user@bitbucket.org/team/app.git", "feature", "main");
    expect(url).toBe("https://bitbucket.org/team/app/pull-requests/new?source=feature&dest=main");
  });

  test("builds Bitbucket PR URL with branch containing slash", () => {
    const url = buildPullRequestUrl("https://bitbucket.org/team/app.git", "release/2.3.5", "main");
    expect(url).toBe("https://bitbucket.org/team/app/pull-requests/new?source=release%2F2.3.5&dest=main");
  });

  test("builds Azure DevOps PR URL", () => {
    const url = buildPullRequestUrl("https://dev.azure.com/org/project/_git/repo.git", "feature", "main");
    expect(url).toBe("https://dev.azure.com/org/project/_git/repo/pullrequestcreate?sourceRef=feature&targetRef=main");
  });

  test("builds Gitea PR URL", () => {
    const url = buildPullRequestUrl("git@gitea.example.com:user/repo.git", "feature", "main");
    expect(url).toBe("https://gitea.example.com/user/repo/pulls/new?head=feature&base=main");
  });

  test("builds generic PR URL for unknown host", () => {
    const url = buildPullRequestUrl("git@git.my-company.io:user/repo.git", "feature", "main");
    expect(url).toBe("https://git.my-company.io/user/repo/pulls/new?head=feature&base=main");
  });

  test("returns null when remote URL cannot be parsed", () => {
    expect(buildPullRequestUrl("", "feature", "main")).toBeNull();
  });

  test("returns null when remote URL is a local path", () => {
    expect(buildPullRequestUrl("/home/user/project", "feature", "main")).toBeNull();
  });

  test("encodes branch names with special characters", () => {
    const url = buildPullRequestUrl("https://github.com/user/repo.git", "feature/my branch", "main");
    expect(url).toContain(encodeURIComponent("feature/my branch"));
    expect(url).not.toContain("feature/my branch");
  });

  test("uses provided base branch", () => {
    const url = buildPullRequestUrl("https://github.com/user/repo.git", "feature", "develop");
    expect(url).toContain("develop...feature");
  });
});
