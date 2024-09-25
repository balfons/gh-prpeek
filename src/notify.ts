import notifier from "node-notifier";
import { CheckStatus, PullRequest, ReviewComment } from "./models/PullRequest";

const findPr = (allPrs: PullRequest[], prToFind: PullRequest) =>
  allPrs.find(
    ({ number, repositoryId }) =>
      prToFind.number === number && prToFind.repositoryId === repositoryId
  );

const newPrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => !findPr(previousPrs, pr));
};

const newMergablePrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => {
    const previousPr = findPr(previousPrs, pr);
    return previousPr && !previousPr.isMergable && pr.isMergable;
  });
};

const newFailingPrs = (previousPrs: PullRequest[], prs: PullRequest[]) => {
  return prs.filter((pr) => {
    const previousPr = findPr(previousPrs, pr);
    return (
      previousPr &&
      previousPr.checkStatus !== CheckStatus.FAILURE &&
      pr.checkStatus === CheckStatus.FAILURE
    );
  });
};

const getNewComments = (
  previousPrs: PullRequest[],
  prs: PullRequest[]
): { pullRequest: PullRequest; newComments: ReviewComment[] }[] =>
  prs.reduce<{ pullRequest: PullRequest; newComments: ReviewComment[] }[]>(
    (prsWithNewComments, pr) => {
      const previousPr = findPr(previousPrs, pr);
      const previousComments = previousPr ? previousPr.reviewComments : [];

      const newComments = pr.reviewComments.filter(
        (comment) =>
          !previousComments.find(
            (previousComment) => previousComment.id === comment.id
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
        subtitle: pr.author,
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
        subtitle: pr.author,
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
        subtitle: pr.author,
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
        subtitle: newComments.map((c) => c.author).join(", "),
        message: pullRequest.title,
        open: pullRequest.url,
        sound: true,
        timeout: 10,
      });
    });
  }
};
