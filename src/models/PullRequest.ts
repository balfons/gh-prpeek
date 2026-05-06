export type ReviewComment = {
  author: string;
  id: string;
};

type WorkflowCheck = {
  name: string;
  url: string;
};

export enum CheckStatus {
  SUCCESSFUL = "SUCCESSFUL",
  PENDING = "PENDING",
  FAILURE = "FAILURE",
  NONE = "NONE",
}

export type Label = {
  name: string;
  color: string;
}

export interface PullRequest {
  title: string;
  number: number;
  repository: string;
  url: string;
  labels: Label[];
  author: string;
  isDraft: boolean;
  isReviewRequested: boolean;
  isMergable: boolean;
  repositoryId: string;
  hasConflicts: boolean;
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED" | "CHANGES_REQUESTED";
  approvedCount: number;
  approvedByMe: boolean;
  reviewComments: ReviewComment[];
  requestedChangeCount: number;
  failingChecks: WorkflowCheck[];
  pendingChecks: WorkflowCheck[];
  successfulChecks: WorkflowCheck[];
  totalChecksCount: number;
  additions: number;
  deletions: number;
  checkStatus: CheckStatus;
}
