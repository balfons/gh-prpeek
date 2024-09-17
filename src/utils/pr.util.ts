import { PullRequest } from "../types";

export const isMergable = ({ mergeStateStatus, mergeable }: PullRequest) => {
  return mergeable === "MERGEABLE" && mergeStateStatus === "CLEAN";
};

export const hasConflicts = ({ mergeStateStatus, mergeable }: PullRequest) => {
  return mergeable === "CONFLICTING" && mergeStateStatus === "DIRTY";
};

export const isStatusSuccessful = (pr: PullRequest) => {
  return pr.statusCheckRollup.every(
    (statusCheck) =>
      statusCheck.status === "COMPLETED" &&
      (statusCheck.conclusion === "SUCCESS" ||
        statusCheck.conclusion === "NEUTRAL")
  );
};

export const isStatusPending = (pr: PullRequest) => {
  return pr.statusCheckRollup.some(
    (statusCheck) => statusCheck.status === "IN_PROGRESS"
  );
};

export const isStatusFailure = (pr: PullRequest) => {
  const hasFailedStatus = pr.statusCheckRollup.some(
    (statusCheck) => statusCheck.conclusion === "FAILURE"
  );

  return hasFailedStatus && !isStatusPending(pr);
};

export const getFailedStatusChecks = ({ statusCheckRollup }: PullRequest) => {
  return statusCheckRollup.filter(
    (statusCheck) => statusCheck.conclusion === "FAILURE"
  );
};

export const getComments = ({ reviews }: PullRequest) => {
  return reviews.filter((review) => review.state === "COMMENTED");
};
