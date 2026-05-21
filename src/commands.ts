import { $, ShellPromise } from "bun";
import { PullRequestFactory } from "./models/PullRequestFactory";
import {
  type PullRequestResponse,
  type UserResponse,
} from "./models/GitHubResponse";
import { type User } from "./models/User";
import { UserFactory } from "./models/UserFactory";

const makeGhJsonRequest = async <T>(
  command: ShellPromise,
  args: Record<string, string>,
): Promise<T> => {
  const env = { ...process.env, GH_PAGER: "", ...args };
  try {
    return await command.env(env).json();
  } catch (error: any) {
    if (error.stderr) {
      const message = String(error.stderr);
      throw new Error(message, { cause: error });
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

export const userFields = ["login", "id"] as const;

export const fetchMentionedPrs = async (repo: string, activeUser: User) => {
  const command = $`gh pr list --search "mentions:@me -author:@me" --repo $REPO --json $FIELDS`;

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
  });

  return pullRequests.map((pr) => PullRequestFactory.from(pr, activeUser));
};

export const fetchReviewedPrs = async (repo: string, activeUser: User) => {
  const command = $`gh pr list --search "reviewed-by:@me -author:@me" --repo $REPO --json $FIELDS`;

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
  });

  return pullRequests.map((pr) => PullRequestFactory.from(pr, activeUser));
};

export const fetchMyPullRequests = async (repo: string, activeUser: User) => {
  const command = $`gh pr list --repo $REPO --author="@me" --json $FIELDS`;

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
  });

  return pullRequests.map((pr) => PullRequestFactory.from(pr, activeUser));
};

export const fetchRequestingReviewPullRequests = async (
  repo: string,
  labels: string[],
  teamMembers: User[],
  activeUser: User,
) => {
  const command = $`gh pr list --repo $REPO --search $SEARCH --json $FIELDS`;
  let queries = ["review-requested:@me"];

  if (labels.length > 0) {
    queries.push(`label:${labels.join(",")}`);
  }

  teamMembers.forEach((member) => {
    if (labels.length > 0) {
      queries.push(
        `OR -reviewed-by:@me -author:@me label:${labels.join(",")} reviewed-by:${member.login}`,
      );
    } else {
      queries.push(
        `OR -reviewed-by:@me -author:@me reviewed-by:${member.login}`,
      );
    }
  });

  const pullRequests = await makeGhJsonRequest<PullRequestResponse[]>(command, {
    REPO: repo,
    FIELDS: prFields.join(","),
    SEARCH: `${queries.join(" ")}`,
  });

  return pullRequests.map((pr) => PullRequestFactory.from(pr, activeUser));
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

export const fetchTeamMembers = async (
  org: string,
  team: string,
): Promise<User[]> => {
  const command = $`gh api orgs/$ORG/teams/$TEAM/members`;
  const response = await makeGhJsonRequest<UserResponse[]>(command, {
    ORG: org,
    TEAM: team,
  });

  return response.map(UserFactory.from);
};

export const getActiveGithubUser = async (): Promise<User> => {
  const command = $`gh api user`;
  const user = await makeGhJsonRequest<UserResponse>(command, {});

  return UserFactory.from(user);
};
