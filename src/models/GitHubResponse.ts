import { prSearchFields, prStatusFields } from "../commands";
import { GitHubPullRequest, GitHubSearchPullRequest } from "./GitHub";

type PullRequestStatusResponseFields = (typeof prStatusFields)[number];
export type PullRequestStatusResponse = Pick<
  GitHubPullRequest,
  PullRequestStatusResponseFields
>;

type PullRequestSearchResponseFields = (typeof prSearchFields)[number];
export type PullRequestSearchResponse = Pick<
  GitHubSearchPullRequest,
  PullRequestSearchResponseFields
>;

export interface PullRequestStatusResponses {
  createdBy: PullRequestStatusResponse[];
  needsReview: PullRequestStatusResponse[];
}
