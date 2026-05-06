interface StatusCheckRollup {
  __typename: string;
  completedAt: string;
  conclusion: "SUCCESS" | "FAILURE" | "NEUTRAL" | "SKIPPED" | "CANCELLED" | "";
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

export interface GitHubUser {
  avatar_url: string;
  events_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  gravatar_id: string;
  html_url: string;
  id: number;
  login: string;
  node_id: string;
  organizations_url: string;
  received_events_url: string;
  repos_url: string;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  type: string;
  url: string;
  user_view_type: string;
}

export interface GitHubMyUser extends GitHubUser {
  name: string;
  company: string | null;
  blog: string;
  location: string | null;
  email: string;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  notification_email: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}
