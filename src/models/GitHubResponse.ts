import { prFields, userFields } from "../commands";
import { GitHubPullRequest, GitHubUser } from "./GitHub";

type PullRequestStatusResponseFields = (typeof prFields)[number];
export type PullRequestResponse = Pick<
  GitHubPullRequest,
  PullRequestStatusResponseFields
>;

type UserResponseFields = (typeof userFields)[number];
export type UserResponse = Pick<GitHubUser, UserResponseFields>;
