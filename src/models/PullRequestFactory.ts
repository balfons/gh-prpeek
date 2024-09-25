import { PullRequestStatusResponse } from "./GitHubResponse";
import { CheckStatus, PullRequest } from "./PullRequest";

const getCheckStatus = (pr: PullRequestStatusResponse): CheckStatus => {
  const allChecksPassing = pr.statusCheckRollup.every(
    (statusCheck) =>
      statusCheck.status === "COMPLETED" &&
      (statusCheck.conclusion === "SUCCESS" ||
        statusCheck.conclusion === "NEUTRAL")
  );
  if (allChecksPassing) {
    return CheckStatus.SUCCESSFUL;
  }

  const someArePending = pr.statusCheckRollup.some(
    (statusCheck) => statusCheck.status === "IN_PROGRESS"
  );
  if (someArePending) {
    return CheckStatus.SUCCESSFUL;
  }

  const someAreFailing = pr.statusCheckRollup.some(
    (statusCheck) => statusCheck.conclusion === "FAILURE"
  );

  if (someAreFailing) {
    return CheckStatus.FAILURE;
  }

  return CheckStatus.NONE;
};

const from = (pr: PullRequestStatusResponse): PullRequest => {
  const title = pr.title;
  const number = pr.number;
  const additions = pr.additions;
  const deletions = pr.deletions;
  const repository = pr.headRepository.name;
  const repositoryId = pr.headRepository.id;
  const url = pr.url;
  const author = pr.author.name || pr.author.login;
  const isDraft = pr.isDraft;
  const isReviewRequested = !pr.reviewDecision && pr.reviewRequests.length > 0;
  const isMergable =
    pr.mergeable === "MERGEABLE" && pr.mergeStateStatus === "CLEAN";
  const hasConflicts =
    pr.mergeable === "CONFLICTING" && pr.mergeStateStatus === "DIRTY";
  const reviewDecision = pr.reviewDecision;
  const approvedCount = pr.reviews.reduce(
    (count, review) => (review.state === "APPROVED" ? count + 1 : count),
    0
  );
  const requestedChangeCount = pr.reviews.reduce(
    (count, review) =>
      review.state === "CHANGES_REQUESTED" ? count + 1 : count,
    0
  );
  const reviewComments = pr.reviews
    .filter((review) => review.state === "COMMENTED")
    .map((review) => ({
      author: review.author.login,
      id: review.id,
    }));

  const failingChecks = pr.statusCheckRollup
    .filter((statusCheck) => statusCheck.conclusion === "FAILURE")
    .map((statusCheck) => ({
      name: statusCheck.name,
      url: statusCheck.detailsUrl,
    }));

  const totalChecksCount = pr.statusCheckRollup.length;

  const checkStatus = getCheckStatus(pr);
  const labels = pr.labels.map((label) => label.name);

  return {
    title,
    number,
    additions,
    deletions,
    author,
    labels,
    repository,
    repositoryId,
    url,
    isDraft,
    isReviewRequested,
    isMergable,
    hasConflicts,
    reviewComments,
    reviewDecision,
    approvedCount,
    requestedChangeCount,
    failingChecks,
    totalChecksCount,
    checkStatus,
  };
};

export const PullRequestFactory = {
  from,
};
