import chalk from "chalk";
import terminalLink from "terminal-link";
import { CheckStatus, PullRequest } from "../models/PullRequest";
import boxen, { Options } from "boxen";
import terminalColumns from "terminal-columns";

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

export const formatRepoNames = (repos: string[]): string[] =>
  repos.map((repo) => repo.split("/").pop()).filter((r) => r !== undefined);

const formatPrNumber = (pr: PullRequest) => {
  const prNumberText = `#${pr.number}`;
  const prNumber = pr.isDraft
    ? chalk.dim(prNumberText)
    : chalk.green(prNumberText);

  return {
    prNumber,
    prNumberLength: prNumberText.length + 1,
  };
};

const formatPrTitle = (pr: PullRequest) => {
  return terminalLink(pr.title, pr.url, {
    fallback: false,
  });
};

const formatPrAuthor = (pr: PullRequest) => {
  return chalk.blue(pr.author);
};

const formatPrRepo = (pr: PullRequest) => {
  return chalk.cyan(`[${pr.repository}]`);
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

export const formatPrText = (pr: PullRequest) => {
  const { prNumber: number, prNumberLength: infoIndent } = formatPrNumber(pr);
  const title = formatPrTitle(pr);
  const author = formatPrAuthor(pr);
  const repo = formatPrRepo(pr);
  const additionsAndDeletions = getAdditionsDeletionsText(pr);
  const statusCheck = getStatusCheckText(pr);
  const comments = getCommentsText(pr);
  const reviewDecision = getReviewDecisionText(pr);
  const mergeableState = getMergeableStateText(pr);
  const failedChecksText = getFailedChecksText(pr, infoIndent);

  const titleRow = `${number} ${title}`;
  const infoRow1 = `${author} ${repo} ${additionsAndDeletions}`;
  const infoRow2 = `${statusCheck} ${comments} ${reviewDecision} ${mergeableState}`;

  let output = `${titleRow}\n${indent(infoIndent)}${infoRow1}\n${indent(
    infoIndent - 2
  )}${infoRow2}`;

  if (failedChecksText) {
    output = `${output}\n${indent(infoIndent)}${failedChecksText}`;
  }

  return output;
};

const getStatusCheckText = (pr: PullRequest) => {
  switch (pr.checkStatus) {
    case CheckStatus.SUCCESSFUL:
      return chalk.green("✓ Checks passing");
    case CheckStatus.PENDING:
      return chalk.yellow("- Checks pending");
    case CheckStatus.FAILURE:
      return chalk.red(
        `× ${pr.failingChecks.length}/${pr.totalChecksCount} checks failing`
      );
    case CheckStatus.NONE:
      return " ";
  }
};

const getCommentsText = (pr: PullRequest) => {
  const count = pr.reviewComments.length;
  const text = count === 1 ? "Comment" : "Comments";
  return chalk.dim(`◆ ${count} ${text}`);
};

const getFailedChecksText = (pr: PullRequest, indentAmount: number) => {
  const failedChecks = pr.failingChecks;

  if (failedChecks.length > 0) {
    return `${failedChecks
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

const formatPrTexts = ({
  prs,
  title,
  noResultMessage,
}: {
  prs: PullRequest[];
  title: string;
  noResultMessage: string;
}) => {
  const formattedBody =
    prs.length === 0
      ? `${indent(2)}${chalk.dim(noResultMessage)}`
      : prs?.map(formatPrText).join("\n");

  return {
    title,
    body: formattedBody,
  };
};

export const renderOutput = ({
  myPrs,
  requestingReviewPrs,
  reviewedPrs,
  showReviewed,
}: {
  myPrs: PullRequest[];
  requestingReviewPrs: PullRequest[];
  reviewedPrs: PullRequest[];
  showReviewed: boolean;
}) => {
  const terminalWidth = process.stdout.columns;

  const getColumnWidth = (totalWidth: number) => {
    if (totalWidth > 100) {
      return totalWidth / 2;
    } else {
      return totalWidth;
    }
  };

  const columnWidth = getColumnWidth(terminalWidth);

  // Created by you
  const { title: createdByHeading, body: prsCreatedByYouBody } = formatPrTexts({
    prs: myPrs,
    title: "Created by you",
    noResultMessage: "No PRs created by you",
  });

  // Requesting review
  const { title: requestingReviewHeading, body: prsRequestingReviewBody } =
    formatPrTexts({
      prs: requestingReviewPrs,
      title: "Requesting a code review from you",
      noResultMessage: "No PRs requesting review from you",
    });

  // Reviewed by you
  const { title: reviewedByYouHeading, body: prsReviewedByYouBody } =
    formatPrTexts({
      prs: reviewedPrs,
      title: "Reviwed by you",
      noResultMessage: "No open PRs reviewed by you",
    });

  const boxenStyles: Options = {
    padding: 1,
    borderColor: "magenta",
    borderStyle: "round",
    fullscreen: () => [columnWidth, 0],
  };

  let createdByYouOutput = boxen(prsCreatedByYouBody, {
    ...boxenStyles,
    title: createdByHeading,
  });

  const requestingReviewOutput = boxen(prsRequestingReviewBody, {
    ...boxenStyles,
    title: requestingReviewHeading,
  });

  const reviwedByYouOutput = boxen(prsReviewedByYouBody, {
    ...boxenStyles,
    title: reviewedByYouHeading,
  });

  if (showReviewed) {
    createdByYouOutput = `${createdByYouOutput}\n${reviwedByYouOutput}`;
  }

  // Create table data
  const tableData = [[requestingReviewOutput, createdByYouOutput]];

  // Render table
  const output = terminalColumns(tableData, (stdoutColumns) => {
    if (stdoutColumns > 100) {
      return [{ width: columnWidth }, { width: columnWidth }];
    } else {
      return [{ width: columnWidth }, { width: columnWidth }];
    }
  });

  console.log(output);
};
