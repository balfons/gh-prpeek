import chalk from "chalk";
import terminalLink from "terminal-link";
import {
  BasePullRequest,
  PullRequest,
  PullRequestStatusResponse,
  Review,
} from "../types";
import {
  getComments,
  getFailedStatusChecks,
  hasConflicts,
  isMergable,
  isStatusFailure,
  isStatusPending,
  isStatusSuccessful,
} from "./pr.util";

const indent = (amount: number) => {
  return Array.from(Array(amount)).reduce(
    (totalIndent) => `${totalIndent}${" "}`,
    ""
  );
};

export const formatReposTitle = (repos: string[]): string => {
  return repos.map((repo) => repo.split("/").pop()).join(" • ");
};

export const formatPrTitle = (pullRequest: BasePullRequest) => {
  const prNumberText = `#${pullRequest.number}`;
  const subtitleIndent = prNumberText.length + 3;
  const prNumber = pullRequest.isDraft
    ? chalk.dim(prNumberText)
    : chalk.green(prNumberText);
  const title = terminalLink(pullRequest.title, pullRequest.url, {
    fallback: false,
  });
  const author = chalk.blue(
    `${pullRequest.author.name || pullRequest.author.login}`
  );

  const repoName = chalk.cyan(
    `[${pullRequest.headRepository?.name ?? pullRequest.repository?.name}]`
  );

  return {
    title: `${prNumber} ${title}\n${indent(
      subtitleIndent
    )}${author} ${repoName}`,
    subtitleIndent,
  };
};

const getMergeableStateText = (pr: PullRequest) => {
  if (isMergable(pr)) {
    return chalk.green("↢ Mergeable");
  } else if (hasConflicts(pr)) {
    return chalk.red("× Conflicts");
  } else {
    return "";
  }
};

export const formatPrText = (pullRequest: PullRequest) => {
  const statusCheck = getStatusCheck(pullRequest);
  const reviewDecision = getReviewDecisionText(
    pullRequest,
    pullRequest.reviews
  );
  const comments = getCommentsText(pullRequest);
  const formattedPrHeadline = formatPrTitle(pullRequest);
  const failedChecksText = getFailedChecksText(
    pullRequest,
    formattedPrHeadline.subtitleIndent
  );
  const additionsAndDeletions = getAdditionsDeletionsText(pullRequest);
  const mergeableState = getMergeableStateText(pullRequest);

  return `${formattedPrHeadline.title} ${additionsAndDeletions}\n${indent(
    formattedPrHeadline.subtitleIndent - 2
  )}${statusCheck} ${comments} ${reviewDecision} ${mergeableState}${failedChecksText}`;
};

const getStatusCheck = (pullRequest: PullRequest) => {
  if (isStatusSuccessful(pullRequest)) {
    return chalk.green("✓ Checks passing");
  }

  if (isStatusPending(pullRequest)) {
    return chalk.yellow("- Checks pending");
  }

  const failedChecks = getFailedStatusChecks(pullRequest);

  if (isStatusFailure(pullRequest)) {
    return chalk.red(
      `× ${failedChecks.length}/${pullRequest.statusCheckRollup.length} checks failing`
    );
  }

  return "";
};

const getCommentsText = (pullRequest: PullRequest) => {
  const count = getComments(pullRequest).length;
  const text = count === 1 ? "Comment" : "Comments";
  return chalk.dim(`${count} ${text}`);
};

const getFailedChecksText = (
  pullRequest: PullRequest,
  indentAmount: number
) => {
  const failedChecks = getFailedStatusChecks(pullRequest);
  return failedChecks.length > 0
    ? `\n${indent(indentAmount)}${failedChecks
        .map((check) =>
          chalk.redBright(
            terminalLink(check.name, check.detailsUrl, { fallback: false })
          )
        )
        .join(`\n${indent(indentAmount)}`)}`
    : "";
};

const getReviewDecisionText = (pr: PullRequest, reviews: Review[]) => {
  if (pr.reviewDecision === "REVIEW_REQUIRED") {
    return chalk.yellow("• Review required");
  }

  if (pr.reviewDecision === "CHANGES_REQUESTED") {
    const changeCount = reviews.reduce(
      (count, review) =>
        review.state === "CHANGES_REQUESTED" ? count + 1 : count,
      0
    );
    const text = changeCount === 1 ? "Requested change" : "Requested changes";
    return chalk.red(`⚑ ${changeCount} ${text}`);
  }

  if (pr.reviewDecision === "APPROVED") {
    const approvedCount = reviews.reduce(
      (count, review) => (review.state === "APPROVED" ? count + 1 : count),
      0
    );
    return chalk.green(`✓ ${approvedCount} Approved`);
  }

  if (!pr.reviewDecision && pr.reviewRequests.length > 0) {
    return chalk.magenta("• Review requested");
  }
};

const getAdditionsDeletionsText = (pr: PullRequest) => {
  const additions = chalk.green(`+${pr.additions}`);
  const deletions = chalk.red(`-${pr.deletions}`);
  return `[${additions} ${deletions}]`;
};

export const formattedDateText = () => {
  const date = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeStyle: "medium",
    hour12: false,
  };

  const formattedDate = new Intl.DateTimeFormat("se-sv", dateOptions).format(
    date
  );
  const formattedTime = new Intl.DateTimeFormat("se-sv", timeOptions).format(
    date
  );

  return `${formattedDate} ${formattedTime}`;
};

export const formattedTextsCreatedByYou = (
  fetchPrStatusResponses: PullRequestStatusResponse[]
) => {
  const createdByHeading = chalk.bold("Created by you:");
  const prsCreatedByYou = fetchPrStatusResponses.flatMap(
    (res) => res.createdBy
  );
  const prsCreatedByYouText =
    prsCreatedByYou.length === 0
      ? `${indent(2)}${chalk.dim("No PRs created by you")}`
      : prsCreatedByYou
          .map((pr) => `${indent(2)}${formatPrText(pr)}`)
          .join("\n");

  return {
    createdByHeading,
    prsCreatedByYou,
    prsCreatedByYouText,
  };
};

export const formattedTextsRequestingReview = (
  fetchPrStatusResponses: PullRequestStatusResponse[],
  labels: string[]
) => {
  const requestingReviewHeading = chalk.bold(
    "Requesting a code review from you:"
  );
  const prsRequestingReview = fetchPrStatusResponses
    .flatMap((res) => res.needsReview)
    .filter(
      (pr) =>
        !labels ||
        pr.labels.some((label) => labels.includes(label.name.toLowerCase()))
    );
  const prsRequestingReviewText =
    prsRequestingReview.length === 0
      ? `${indent(2)}${chalk.dim("No PRs requesting review from you")}`
      : prsRequestingReview
          .map((pr) => `${indent(2)}${formatPrText(pr)}`)
          .join("\n");

  return {
    requestingReviewHeading,
    prsRequestingReview,
    prsRequestingReviewText,
  };
};

export const formattedTextsInvolvingYou = (
  fetchPrSearchResponses: BasePullRequest[][] | undefined,
  prsCreatedByYou: PullRequest[],
  prsRequestingReview: PullRequest[]
) => {
  const invlovedHeading = fetchPrSearchResponses
    ? chalk.bold("Involves you:")
    : "";
  const prsInvolvingYou = (fetchPrSearchResponses?.flat() ?? []).filter(
    (pr) =>
      !prsCreatedByYou.some(
        (pullRequest) => pullRequest.number === pr.number
      ) &&
      !prsRequestingReview.some(
        (pullRequest) => pullRequest.number === pr.number
      )
  );
  const prsInvolvingYouText =
    prsInvolvingYou.length === 0
      ? `${indent(2)}${chalk.dim("No PRs involving you")}`
      : prsInvolvingYou
          ?.map((pr) => `${indent(2)}${formatPrTitle(pr).title}`)
          .join("\n");

  return {
    invlovedHeading,
    prsInvolvingYouText,
    prsInvolvingYou,
  };
};
