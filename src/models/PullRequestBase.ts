export interface PullRequestBase {
  title: string;
  number: number;
  repository: string;
  url: string;
  labels: string[];
  author: string;
  isDraft: boolean;
}
