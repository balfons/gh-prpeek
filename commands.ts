import { BasePullRequest, PullRequestStatusResponse } from "./types";

const makeGhRequest = async <T>(command: string[]): Promise<T> => {
  const env = { ...process.env, GH_PAGER: "" };
  try {
    const process = Bun.spawnSync(command, {
      env,
    });

    const error = await new Response(process.stderr).text();
    if (error) {
      throw error;
    } else {
      return new Response(process.stdout).json();
    }
  } catch (error: any) {
    if (error.code === "ERR_INVALID_ARG_TYPE") {
      throw "GitHub CLI needs to be installed in order to run prpeek: https://github.com/cli/cli#installation";
    } else {
      throw error;
    }
  }
};

export const fetchInvolvedPrs = async (
  repo: string
): Promise<BasePullRequest[]> => {
  const ghPrCommand = [
    "gh",
    "search",
    "prs",
    "--repo",
    repo,
    "--state",
    "open",
    "--involves",
    "@me",
    "--json",
    "author,title,isDraft,labels,url,number",
  ];

  return makeGhRequest(ghPrCommand);
};

export const fetchPrStatus = async (
  repo: string
): Promise<PullRequestStatusResponse> => {
  const repoUrl = `https://github.com/${repo}`;
  const ghPrCommand = [
    "gh",
    "pr",
    "status",
    "--repo",
    repoUrl,
    "--json",
    "title,url,number,headRefName,statusCheckRollup,isDraft,reviewDecision,labels,author,additions,deletions",
  ];

  return makeGhRequest(ghPrCommand);
};
