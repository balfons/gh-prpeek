import chalk from "chalk";
import terminalLink from "terminal-link";
import {
  BasePullRequest,
  PullRequest,
  PullRequestStatusResponse,
  Review,
} from "./types";

const indent = (amount: number) => {
  return Array.from(Array(amount)).reduce(
    (totalIndent) => `${totalIndent}${"  "}`,
    ""
  );
};

export const formatPrTitle = (pullRequest: BasePullRequest): string => {
  const prNumber = pullRequest.isDraft
    ? chalk.dim(`#${pullRequest.number}`)
    : chalk.green(`#${pullRequest.number}`);
  const title = terminalLink(pullRequest.title, pullRequest.url, {
    fallback: false,
  });
  const author = chalk.blue(
    `[${pullRequest.author.name || pullRequest.author.login}]`
  );

  const repoName = chalk.cyan(
    `[${pullRequest.headRepository?.name ?? pullRequest.repository?.name}]`
  );

  return `${prNumber} ${title} ${author} ${repoName}`;
};

const isMergable = ({ mergeStateStatus, mergeable }: PullRequest) => {
  return mergeable === "MERGEABLE" && mergeStateStatus === "CLEAN";
};

const hasConflicts = ({ mergeStateStatus, mergeable }: PullRequest) => {
  return mergeable === "CONFLICTING" && mergeStateStatus === "DIRTY";
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
    pullRequest.reviewDecision,
    pullRequest.reviews
  );
  const comments = getCommentsText(pullRequest);
  const failedChecksText = getFailedChecksText(pullRequest.statusCheckRollup);
  const additionsAndDeletions = getAdditionsDeletionsText(pullRequest);
  const mergeableState = getMergeableStateText(pullRequest);

  return `${formatPrTitle(pullRequest)} ${additionsAndDeletions}\n${indent(
    2
  )}${statusCheck} ${comments} ${reviewDecision} ${mergeableState}${failedChecksText}`;
};

const getStatusCheck = ({ statusCheckRollup }: PullRequest) => {
  const isSuccessful = statusCheckRollup.every(
    (statusCheck) =>
      statusCheck.status === "COMPLETED" &&
      (statusCheck.conclusion === "SUCCESS" ||
        statusCheck.conclusion === "NEUTRAL")
  );
  if (isSuccessful) {
    return chalk.green("✓ Checks passing");
  }

  const isPending = statusCheckRollup.some(
    (statusCheck) => statusCheck.status === "IN_PROGRESS"
  );
  if (isPending) {
    return chalk.yellow("- Checks pending");
  }

  const isFailure = statusCheckRollup.some(
    (statusCheck) => statusCheck.conclusion === "FAILURE"
  );
  const failedChecks = getFailedChecks(statusCheckRollup);

  if (isFailure) {
    return chalk.red(
      `× ${failedChecks.length}/${statusCheckRollup.length} checks failing`
    );
  }

  return "";
};

const getFailedChecks = (
  statusCheckRollup: PullRequest["statusCheckRollup"]
) => {
  return statusCheckRollup.filter(
    (statusCheck) => statusCheck.conclusion === "FAILURE"
  );
};

const getCommentsText = (pullRequest: PullRequest) => {
  const count = pullRequest.reviews.reduce(
    (total, review) => (review.state === "COMMENTED" ? total + 1 : total),
    0
  );
  const text = count === 1 ? "Comment" : "Comments";
  return chalk.dim(`${count} ${text}`);
};

const getFailedChecksText = (
  statusCheckRollup: PullRequest["statusCheckRollup"]
) => {
  const failedChecks = getFailedChecks(statusCheckRollup);
  return failedChecks.length > 0
    ? `\n${indent(3)}${failedChecks
        .map((check) =>
          chalk.redBright(
            terminalLink(check.name, check.detailsUrl, { fallback: false })
          )
        )
        .join(`\n${indent(3)}`)}`
    : "";
};

const getReviewDecisionText = (
  reviewDecision: PullRequest["reviewDecision"],
  reviews: Review[]
) => {
  if (reviewDecision === "REVIEW_REQUIRED") {
    return chalk.yellow("• Review required");
  }

  if (reviewDecision === "CHANGES_REQUESTED") {
    const changeCount = reviews.reduce(
      (count, review) =>
        review.state === "CHANGES_REQUESTED" ? count + 1 : count,
      0
    );
    const text = changeCount === 1 ? "Requested change" : "Requested changes";
    return chalk.red(`⚑ ${changeCount} ${text}`);
  }

  if (reviewDecision === "APPROVED") {
    const approvedCount = reviews.reduce(
      (count, review) => (review.state === "APPROVED" ? count + 1 : count),
      0
    );
    return chalk.green(`✓ ${approvedCount} Approved`);
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
      ? `${indent(1)}${chalk.dim("No PRs created by you")}`
      : prsCreatedByYou
          .map((pr) => `${indent(1)}${formatPrText(pr)}`)
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
      ? `${indent(1)}${chalk.dim("No PRs requesting review from you")}`
      : prsRequestingReview
          .map((pr) => `${indent(1)}${formatPrText(pr)}`)
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
      ? `${indent(1)}${chalk.dim("No PRs involving you")}`
      : prsInvolvingYou
          ?.map((pr) => `${indent(1)}${formatPrTitle(pr)}`)
          .join("\n");

  return {
    invlovedHeading,
    prsInvolvingYouText,
    prsInvolvingYou,
  };
};
