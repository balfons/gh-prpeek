import { prFields } from "../commands";
import { GitHubPullRequest } from "./GitHub";

type PullRequestStatusResponseFields = (typeof prFields)[number];
export type PullRequestResponse = Pick<
  GitHubPullRequest,
  PullRequestStatusResponseFields
>;
