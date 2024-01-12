export interface StatusCheckRollup {
  __typename: string;
  completedAt: string;
  conclusion: "SUCCESS" | "FAILURE";
  detailsUrl: string;
  name: string;
  startedAt: string;
  status: "COMPLETED" | "IN_PROGRESS";
  workflowName: string;
}

export interface Author {
  id: string;
  is_bot: boolean;
  login: string;
  name: string;
}

export interface Label {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface BasePullRequest {
  author: Author;
  title: string;
  number: number;
  url: string;
  isDraft: boolean;
  labels: Label[];
}

export interface PullRequest extends BasePullRequest {
  headRefName: string;
  statusCheckRollup: StatusCheckRollup[];
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED";
  additions: number;
  deletions: number;
}

export interface PullRequestStatusResponse {
  createdBy: PullRequest[];
  needsReview: PullRequest[];
}
