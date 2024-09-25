import chalk from "chalk";
import terminalLink from "terminal-link";
import { CheckStatus, PullRequest } from "../models/PullRequest";
import { PullRequestInvolved } from "../models/PullRequestInvolved";
import { PullRequestBase } from "../models/PullRequestBase";

const indent = (amount: number) => {
  return Array.from(Array(amount)).reduce(
    (totalIndent) => `${totalIndent}${" "}`,
    ""
  );
};

export const getUpgradeMessage = (
  currentVersion: string,
  newVersion: string
): string => {
  return `prpeek update available ${chalk.dim(currentVersion)} → ${chalk.green(
    newVersion
  )}\nRun ${chalk.cyan(`gh extension upgrade balfons/gh-prpeek`)} to update`;
};

export const formatReposTitle = (repos: string[]): string => {
  return repos.map((repo) => repo.split("/").pop()).join(" • ");
};

export const formatPrTitle = (pullRequest: PullRequestBase) => {
  const prNumberText = `#${pullRequest.number}`;
  const subtitleIndent = prNumberText.length + 3;
  const prNumber = pullRequest.isDraft
    ? chalk.dim(prNumberText)
    : chalk.green(prNumberText);
  const title = terminalLink(pullRequest.title, pullRequest.url, {
    fallback: false,
  });
  const author = chalk.blue(pullRequest.author);
  const repoName = chalk.cyan(`[${pullRequest.repository}]`);

  return {
    title: `${prNumber} ${title}\n${indent(
      subtitleIndent
    )}${author} ${repoName}`,
    subtitleIndent,
  };
};

const getMergeableStateText = (pr: PullRequest) => {
  if (pr.isMergable) {
    return chalk.green("↢ Mergeable");
  } else if (pr.hasConflicts) {
    return chalk.red("× Conflicts");
  } else {
    return "";
  }
};

export const formatPrText = (pullRequest: PullRequest) => {
  const statusCheck = getStatusCheckText(pullRequest);
  const reviewDecision = getReviewDecisionText(pullRequest);
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

const getStatusCheckText = (pullRequest: PullRequest) => {
  switch (pullRequest.checkStatus) {
    case CheckStatus.SUCCESSFUL:
      return chalk.green("✓ Checks passing");
    case CheckStatus.PENDING:
      return chalk.yellow("- Checks pending");
    case CheckStatus.FAILURE:
      return chalk.red(
        `× ${pullRequest.failingChecks.length}/${pullRequest.totalChecksCount} checks failing`
      );
    case CheckStatus.NONE:
      return " ";
  }
};

const getCommentsText = (pullRequest: PullRequest) => {
  const count = pullRequest.reviewComments.length;
  const text = count === 1 ? "Comment" : "Comments";
  return chalk.dim(`${count} ${text}`);
};

const getFailedChecksText = (pr: PullRequest, indentAmount: number) => {
  const failedChecks = pr.failingChecks;

  if (failedChecks.length > 0) {
    return `\n${indent(indentAmount)}${failedChecks
      .map((check) =>
        chalk.redBright(
          terminalLink(check.name, check.url, { fallback: false })
        )
      )
      .join(`\n${indent(indentAmount)}`)}`;
  }

  return "";
};

const getReviewDecisionText = (pr: PullRequest) => {
  if (pr.reviewDecision === "REVIEW_REQUIRED") {
    return chalk.yellow("• Review required");
  }

  if (pr.reviewDecision === "CHANGES_REQUESTED") {
    const text =
      pr.requestedChangeCount === 1 ? "Requested change" : "Requested changes";
    return chalk.red(`⚑ ${pr.requestedChangeCount} ${text}`);
  }

  if (pr.reviewDecision === "APPROVED") {
    return chalk.green(`✓ ${pr.approvedCount} Approved`);
  }

  if (pr.isReviewRequested) {
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

export const formattedTextsCreatedByYou = (prsCreatedByYou: PullRequest[]) => {
  const createdByHeading = chalk.bold("Created by you:");
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
  prsRequestingReview: PullRequest[],
  labels: string[]
) => {
  const requestingReviewHeading = chalk.bold(
    "Requesting a code review from you:"
  );
  const prsRequestingReviewFilteredOnLabels = prsRequestingReview.filter(
    (pr) =>
      !labels || pr.labels.some((label) => labels.includes(label.toLowerCase()))
  );
  const prsRequestingReviewText =
    prsRequestingReviewFilteredOnLabels.length === 0
      ? `${indent(2)}${chalk.dim("No PRs requesting review from you")}`
      : prsRequestingReviewFilteredOnLabels
          .map((pr) => `${indent(2)}${formatPrText(pr)}`)
          .join("\n");

  return {
    requestingReviewHeading,
    prsRequestingReview,
    prsRequestingReviewText,
  };
};

export const formattedTextsInvolvingYou = (
  fetchPrSearchResponses: PullRequestInvolved[][] | undefined,
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
