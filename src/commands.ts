import { $, ShellPromise, ShellError } from "bun";
import { PullRequestFactory } from "./models/PullRequestFactory";
import { PullRequestResponse } from "./models/GitHubResponse";

const makeGhJsonRequest = async <T>(
  command: ShellPromise,
  args: Record<string, string>
): Promise<T> => {
  const env = { ...process.env, GH_PAGER: "", ...args };
  try {
    return await command.env(env).json();
  } catch (error: any) {
    if (error.stderr) {
      throw error.stderr.toString();
    }

    throw error;
  }
};

export const prFields = [
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

export const fetchReviewedPrs = async (repo: string) => {
  const command = $`gh pr list --search "reviewed-by:@me -author:@me " --repo $REPO --json $FIELDS`;

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
  });

  return pullRequests.map(PullRequestFactory.from);
};

export const fetchMyPullRequests = async (repo: string) => {
  const command = $`gh pr list --repo $REPO --author="@me" --json $FIELDS`;

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
  });

  return pullRequests.map(PullRequestFactory.from);
};

export const fetchRequestingReviewPullRequests = async (
  repo: string,
  labels: string[]
) => {
  const command = $`gh pr list --repo $REPO --search $SEARCH --json $FIELDS`;
  let queries = ["review-requested:@me"];

  if (labels.length > 0) {
    queries.push(`label:${labels.join(",")}`);
  }

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
    SEARCH: `${queries.join(" ")}`,
  });

  return pullRequests.map(PullRequestFactory.from);
};

export const fetchLatestRelease = async (): Promise<string | undefined> => {
  const fields = ["tagName", "isPrerelease"];
  const command = $`gh release list -R balfons/gh-prpeek --json $FIELDS`;

  const releases = await makeGhJsonRequest<
    {
      tagName: string;
      isPrerelease: boolean;
    }[]
  >(command, { FIELDS: fields.join(",") });

  return releases.find((release) => !release.isPrerelease)?.tagName;
};
