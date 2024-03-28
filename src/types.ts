export interface StatusCheckRollup {
  __typename: string;
  completedAt: string;
  conclusion: "SUCCESS" | "FAILURE" | "NEUTRAL";
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
  headRepository?: {
    id: string;
    name: string;
  };
  repository?: {
    name: string;
    nameWithOwner: string;
  };
}

export interface Review {
  id: string;
  author: {
    login: string;
  };
  authorAssociation: "CONTRIBUTOR";
  body: string;
  submittedAt: string;
  includesCreatedEdit: boolean;
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
}
export interface PullRequest extends BasePullRequest {
  headRefName: string;
  statusCheckRollup: StatusCheckRollup[];
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED" | "CHANGES_REQUESTED";
  additions: number;
  deletions: number;
  reviews: Review[];
  mergeable: "CONFLICTING" | "MERGEABLE" | "UNKNOWN";
  mergeStateStatus: "BLOCKED" | "CLEAN" | "DIRTY";
}

export interface PullRequestStatusResponse {
  createdBy: PullRequest[];
  needsReview: PullRequest[];
}
