function stripUserinfo(host) {
  const atIndex = host.lastIndexOf("@");
  return atIndex >= 0 ? host.slice(atIndex + 1) : host;
}

function parseRemoteUrl(url) {
  if (!url || typeof url !== "string") return null;

  const clean = url.replace(/\.git$/, "");

  const azureMatch = clean.match(/^https:\/\/(?:[^@]+@)?(dev\.azure\.com)\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)$/);
  if (azureMatch) {
    return {
      host: azureMatch[1],
      owner: azureMatch[2],
      repo: azureMatch[3] + "/_git/" + azureMatch[4],
      protocol: "https",
    };
  }

  const azureSshMatch = clean.match(/^git@ssh\.dev\.azure\.com:v3\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
  if (azureSshMatch) {
    return {
      host: "dev.azure.com",
      owner: azureSshMatch[1],
      repo: azureSshMatch[2] + "/_git/" + azureSshMatch[3],
      protocol: "ssh",
    };
  }

  const httpsMatch = clean.match(/^https:\/\/([^\/]+)\/([^\/]+?)\/([^\/]+?)$/);
  if (httpsMatch) {
    return {
      host: stripUserinfo(httpsMatch[1]),
      owner: httpsMatch[2],
      repo: httpsMatch[3],
      protocol: "https",
    };
  }

  const sshMatch = clean.match(/^git@([^:]+):(.+?)\/([^\/]+?)$/);
  if (sshMatch) {
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      repo: sshMatch[3],
      protocol: "ssh",
    };
  }

  const gitMatch = clean.match(/^git:\/\/([^\/]+)\/([^\/]+?)\/([^\/]+?)$/);
  if (gitMatch) {
    return {
      host: stripUserinfo(gitMatch[1]),
      owner: gitMatch[2],
      repo: gitMatch[3],
      protocol: "git",
    };
  }

  return null;
}

function detectProvider(parsed) {
  if (!parsed) return "unknown";
  const host = parsed.host.toLowerCase();

  if (host === "github.com") return "github";
  if (host === "gitlab.com" || host.includes("gitlab")) return "gitlab";
  if (host === "bitbucket.org") return "bitbucket";
  if (host === "dev.azure.com" || host.includes("azure.com")) return "azure-devops";
  if (host.includes("gitea") || host.includes("gogs")) return "gitea";

  return "generic";
}

function buildPullRequestUrl(remoteUrl, headBranch, baseBranch) {
  const parsed = parseRemoteUrl(remoteUrl);
  if (!parsed) return null;

  const provider = detectProvider(parsed);
  const baseUrl = `https://${parsed.host}/${parsed.owner}/${parsed.repo}`;
  const encodedHead = encodeURIComponent(headBranch);
  const encodedBase = encodeURIComponent(baseBranch || "main");

  switch (provider) {
    case "github":
      return `${baseUrl}/compare/${encodedBase}...${encodedHead}?expand=1`;
    case "gitlab":
      return `${baseUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodedHead}&merge_request%5Btarget_branch%5D=${encodedBase}`;
    case "bitbucket":
      return `${baseUrl}/pull-requests/new?source=${encodedHead}&dest=${encodedBase}`;
    case "azure-devops":
      return `${baseUrl}/pullrequestcreate?sourceRef=${encodedHead}&targetRef=${encodedBase}`;
    case "gitea":
      return `${baseUrl}/pulls/new?head=${encodedHead}&base=${encodedBase}`;
    default:
      return `${baseUrl}/pulls/new?head=${encodedHead}&base=${encodedBase}`;
  }
}

export { parseRemoteUrl, detectProvider, buildPullRequestUrl };
