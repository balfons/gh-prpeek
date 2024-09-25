import { PullRequest } from "./models/PullRequest";
import { PullRequestFactory } from "./models/PullRequestFactory";
import { PullRequestInvolved } from "./models/PullRequestInvolved";
import { PullRequestInvolvedFactory } from "./models/PullRequestInvolvedFactory";
import {
  PullRequestSearchResponse,
  PullRequestStatusResponses,
} from "./models/GitHubResponse";

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

export const prSearchFields = [
  "author",
  "title",
  "isDraft",
  "labels",
  "url",
  "number",
  "repository",
] as const;

export const fetchInvolvedPrs = async (
  repo: string
): Promise<PullRequestInvolved[]> => {
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
    prSearchFields.join(","),
  ];

  const pullRequests = await makeGhRequest<PullRequestSearchResponse[]>(
    ghPrCommand
  );

  return pullRequests.map(PullRequestInvolvedFactory.from);
};

export const prStatusFields = [
  "title",
  "url",
  "number",
  "headRefName",
  "statusCheckRollup",
  "isDraft",
  "reviewDecision",
  "reviewRequests",
  "labels",
  "author",
  "additions",
  "deletions",
  "headRepository",
  "reviews",
  "mergeable",
  "mergeStateStatus",
] as const;

export const fetchPrStatus = async (
  repo: string
): Promise<{ createdBy: PullRequest[]; needsReview: PullRequest[] }> => {
  const repoUrl = `https://github.com/${repo}`;
  const ghPrCommand = [
    "gh",
    "pr",
    "status",
    "--repo",
    repoUrl,
    "--json",
    prStatusFields.join(","),
  ];

  const { createdBy, needsReview } =
    await makeGhRequest<PullRequestStatusResponses>(ghPrCommand);

  return {
    createdBy: createdBy.map(PullRequestFactory.from),
    needsReview: needsReview.map(PullRequestFactory.from),
  };
};

export const fetchLatestRelease = async (): Promise<string | undefined> => {
  const ghReleaseCommand = [
    "gh",
    "release",
    "list",
    "-R",
    "balfons/gh-prpeek",
    "--json",
    "tagName,isPrerelease",
  ];

  const releases = await makeGhRequest<
    {
      tagName: string;
      isPrerelease: boolean;
    }[]
  >(ghReleaseCommand);

  return releases.find((release) => !release.isPrerelease)?.tagName;
};
