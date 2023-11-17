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

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  statusCheckRollup: StatusCheckRollup[];
  isDraft: boolean;
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED";
  labels: Label[];
  author: Author;
  additions: number;
  deletions: number;
}

export interface PullRequestStatusResponse {
  createdBy: PullRequest[];
  needsReview: PullRequest[];
}
