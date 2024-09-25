interface StatusCheckRollup {
  __typename: string;
  completedAt: string;
  conclusion: "SUCCESS" | "FAILURE" | "NEUTRAL";
  detailsUrl: string;
  name: string;
  startedAt: string;
  status: "COMPLETED" | "IN_PROGRESS";
  workflowName: string;
}

interface Author {
  id: string;
  is_bot: boolean;
  login: string;
  name: string;
}

interface Label {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Review {
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

export interface GitHubSearchPullRequest {
  author: Author;
  title: string;
  number: number;
  url: string;
  isDraft: boolean;
  labels: Label[];
  repository: {
    name: string;
    nameWithOwner: string;
  };
}
export interface GitHubPullRequest {
  title: string;
  url: string;
  isDraft: boolean;
  number: number;
  headRefName: string;
  labels: Label[];
  author: {
    login: string;
    name: string;
  };
  headRepository: {
    id: string;
    name: string;
  };
  statusCheckRollup: StatusCheckRollup[];
  reviewDecision: "APPROVED" | "REVIEW_REQUIRED" | "CHANGES_REQUESTED";
  additions: number;
  deletions: number;
  reviews: Review[];
  reviewRequests: {
    name: string;
  }[];
  mergeable: "CONFLICTING" | "MERGEABLE" | "UNKNOWN";
  mergeStateStatus: "BLOCKED" | "CLEAN" | "DIRTY";
}

