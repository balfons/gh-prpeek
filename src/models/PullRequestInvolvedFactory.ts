import { PullRequestSearchResponse } from "./GitHubResponse";
import { PullRequestInvolved } from "./PullRequestInvolved";

const from = (pr: PullRequestSearchResponse): PullRequestInvolved => {
  const title = pr.title;
  const number = pr.number;
  const repository = pr.repository.name;
  const url = pr.url;
  const author = pr.author.name || pr.author.login;
  const isDraft = pr.isDraft;
  const labels = pr.labels.map((label) => label.name);

  return {
    title,
    number,
    author,
    labels,
    repository,
    url,
    isDraft,
  };
};

export const PullRequestInvolvedFactory = {
  from,
};
