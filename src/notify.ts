import notifier from "node-notifier";
import { PullRequest, Review } from "./types";
import { getComments, isMergable, isStatusFailure } from "./utils/pr.util";

const findPr = (allPrs: PullRequest[], prToFind: PullRequest) =>
  allPrs.find(
    ({ number, headRepository }) =>
      prToFind.number === number &&
      prToFind.headRepository?.id === headRepository?.id
  );

const newPrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => !findPr(previousPrs, pr));
};

const newMergablePrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => {
    const previousPr = findPr(previousPrs, pr);
    return previousPr && !isMergable(previousPr) && isMergable(pr);
  });
};

const newFailingPrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => {
    const previousPr = findPr(previousPrs, pr);
    return previousPr && !isStatusFailure(previousPr) && isStatusFailure(pr);
  });
};

const getNewComments = (
  previousPrs: PullRequest[],
  prs: PullRequest[]
): { pullRequest: PullRequest; newComments: Review[] }[] =>
  prs.reduce<{ pullRequest: PullRequest; newComments: Review[] }[]>(
    (prsWithNewComments, pr) => {
      const previousPr = findPr(previousPrs, pr);
      const previousComments = previousPr ? getComments(previousPr) : [];

      const newComments = getComments(pr).filter(
        (review) =>
          !previousComments.find(
            (previousComment) => previousComment.id === review.id
          )
      );

      if (newComments.length > 0) {
        return [...prsWithNewComments, { pullRequest: pr, newComments }];
      }

      return prsWithNewComments;
    },
    []
  );

export const notifyNewPrs = (
  previousPrs: PullRequest[],
  prs: PullRequest[]
) => {
  const allNew = newPrs(previousPrs, prs);

  if (allNew.length > 0) {
    allNew.forEach((pr) => {
      notifier.notify({
        title: `🆕 New: #${pr.number}`,
        subtitle: pr.author.name || pr.author.login,
        message: pr.title,
        open: pr.url,
        sound: true,
        timeout: 10,
      });
    });
  }
};

export const notifyMergablePrs = (
  yourPreviousPrs: PullRequest[],
  yourPrs: PullRequest[]
) => {
  const mergablePrs = newMergablePrs(yourPreviousPrs, yourPrs);

  if (mergablePrs.length > 0) {
    mergablePrs.forEach((pr) => {
      notifier.notify({
        title: `✅ Mergable: #${pr.number}`,
        subtitle: pr.author.name || pr.author.login,
        message: pr.title,
        open: pr.url,
        sound: true,
        timeout: 10,
      });
    });
  }
};

export const notifyFailingePrs = (
  yourPreviousPrs: PullRequest[],
  yourPrs: PullRequest[]
) => {
  const failingPrs = newFailingPrs(yourPreviousPrs, yourPrs);

  if (failingPrs.length > 0) {
    failingPrs.forEach((pr) => {
      notifier.notify({
        title: `🚨 Failed: #${pr.number}`,
        subtitle: pr.author.name || pr.author.login,
        message: pr.title,
        open: pr.url,
        sound: true,
        timeout: 10,
      });
    });
  }
};

export const notifyNewCommentsPrs = (
  yourPreviousPrs: PullRequest[],
  yourPrs: PullRequest[]
) => {
  const newComments = getNewComments(yourPreviousPrs, yourPrs);

  if (newComments.length > 0) {
    newComments.forEach(({ pullRequest, newComments }) => {
      notifier.notify({
        title: `💬 New comment: #${pullRequest.number}`,
        subtitle: newComments.map((c) => c.author.login).join(", "),
        message: pullRequest.title,
        open: pullRequest.url,
        sound: true,
        timeout: 10,
      });
    });
  }
};
