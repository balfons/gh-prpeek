import { PullRequestBase } from "./PullRequestBase";

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

export interface PullRequest extends PullRequestBase {
  isReviewRequested: boolean;
  isMergable: boolean;
  repositoryId: string;
  hasConflicts: boolean;
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED" | "CHANGES_REQUESTED";
  approvedCount: number;
  reviewComments: ReviewComment[];
  requestedChangeCount: number;
  failingChecks: WorkflowCheck[];
  totalChecksCount: number;
  additions: number;
  deletions: number;
  checkStatus: CheckStatus;
}
