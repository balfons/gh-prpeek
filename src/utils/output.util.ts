import chalk from "chalk";
import terminalLink from "terminal-link";
import { CheckStatus, PullRequest } from "../models/PullRequest";
import boxen, { Options } from "boxen";
import terminalColumns from "terminal-columns";

const indent = (amount: number) => {
  return chalk.hidden(Array.from(Array(amount)).fill("-").join(""));
};

// Non-Break sentence
const nbs = (sentence: string): string => sentence.split(" ").join("\u{00A0}");

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

const formatPrNumber = (pr: PullRequest): string => {
  const prNumberText = `#${pr.number}`;
  const prNumber = pr.isDraft
    ? chalk.dim(prNumberText)
    : chalk.green(prNumberText);

  return prNumber;
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

export const formatPrText = (
  pr: PullRequest,
  hideChecks: boolean,
  columnWidth: number,
  containerWidth: number
) => {
  const number = formatPrNumber(pr);
  const title = formatPrTitle(pr);
  const author = formatPrAuthor(pr);
  const repo = formatPrRepo(pr);
  const additionsAndDeletions = nbs(getAdditionsDeletionsText(pr));
  const { statusCheckText, statusCheckSymbol } = getStatusCheckText(pr);
  const comments = nbs(getCommentsText(pr));
  const reviewDecision = nbs(getReviewDecisionText(pr));
  const mergeableState = nbs(getMergeableStateText(pr));
  const failedChecksText = nbs(getFailedChecksText(pr));

  const indent1 = indent(columnWidth + 2);
  const indent2 = indent(columnWidth);

  const tableData = [
    [number, title],
    [indent1, `${author} ${repo} ${additionsAndDeletions}`],
    [
      `${indent2}${statusCheckSymbol}`,
      `${statusCheckText} ${comments} ${reviewDecision} ${mergeableState}`,
    ],
  ];

  if (!hideChecks && failedChecksText) {
    tableData.push([indent1, failedChecksText]);
  }

  const numberColumn = columnWidth + 2; // PR number + # + " "
  const infoColumn = containerWidth - numberColumn - 8; // 8 = Boxen adds 1 character for box border + 3 characters padding on each side

  return terminalColumns(tableData, [
    { width: numberColumn },
    { width: infoColumn },
  ]);
};

const getStatusCheckText = (
  pr: PullRequest
): { statusCheckText: string; statusCheckSymbol: string } => {
  switch (pr.checkStatus) {
    case CheckStatus.SUCCESSFUL:
      return {
        statusCheckText: chalk.green("Checks passing"),
        statusCheckSymbol: chalk.green("✓"),
      };
    case CheckStatus.PENDING:
      return {
        statusCheckText: chalk.yellow("Checks pending"),
        statusCheckSymbol: chalk.yellow("-"),
      };
    case CheckStatus.FAILURE:
      return {
        statusCheckText: chalk.red(
          terminalLink(
            `${pr.failingChecks.length}/${pr.totalChecksCount} checks failing`,
            `${pr.url}/checks`,
            { fallback: false }
          )
        ),
        statusCheckSymbol: chalk.red("×"),
      };
    case CheckStatus.NONE:
      return { statusCheckText: "", statusCheckSymbol: "" };
  }
};

const getCommentsText = (pr: PullRequest) => {
  const count = pr.reviewComments.length;
  const text = count === 1 ? "Comment" : "Comments";
  return chalk.dim(`◆ ${count} ${text}`);
};

const getFailedChecksText = (pr: PullRequest) => {
  const failedChecks = pr.failingChecks;

  if (failedChecks.length > 0) {
    return `${failedChecks
      .map((check) =>
        chalk.redBright(
          terminalLink(check.name, check.url, { fallback: false })
        )
      )
      .join(`\n`)}`;
  }

  return "";
};

const getReviewDecisionText = (pr: PullRequest): string => {
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

  return "";
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
  hideChecks,
  containerWidth,
}: {
  prs: PullRequest[];
  title: string;
  noResultMessage: string;
  hideChecks: boolean;
  containerWidth: number;
}) => {
  const prNumberColumnWidth = Math.max(
    ...prs.map((pr) => String(pr.number).length)
  );

  const formattedBody =
    prs.length === 0
      ? chalk.dim(noResultMessage)
      : prs
          .map((pr) =>
            formatPrText(pr, hideChecks, prNumberColumnWidth, containerWidth)
          )
          .join("\n");

  return {
    title,
    body: formattedBody,
  };
};

export const renderOutput = ({
  myPrs,
  requestingReviewPrs,
  reviewedPrs,
  mentionedPrs,
  showReviewed,
  showMentioned,
  hideChecks,
}: {
  myPrs: PullRequest[];
  requestingReviewPrs: PullRequest[];
  reviewedPrs: PullRequest[];
  mentionedPrs: PullRequest[];
  showReviewed: boolean;
  showMentioned: boolean;
  hideChecks: boolean;
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
    hideChecks,
    containerWidth: columnWidth,
  });

  // Requesting review
  const { title: requestingReviewHeading, body: prsRequestingReviewBody } =
    formatPrTexts({
      prs: requestingReviewPrs,
      title: "Requesting a code review from you",
      noResultMessage: "No PRs requesting review from you",
      hideChecks,
      containerWidth: columnWidth,
    });

  // Reviewed by you
  const { title: reviewedByYouHeading, body: prsReviewedByYouBody } =
    formatPrTexts({
      prs: reviewedPrs,
      title: "Reviwed by you",
      noResultMessage: "No open PRs reviewed by you",
      hideChecks,
      containerWidth: columnWidth,
    });

  // Mentions you
  const { title: mentionsYouHeading, body: prsMentionsYouBody } = formatPrTexts(
    {
      prs: mentionedPrs,
      title: "Mentions you",
      noResultMessage: "No open PRs mentioning you",
      hideChecks,
      containerWidth: columnWidth,
    }
  );

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

  const mentionsYouOutput = boxen(prsMentionsYouBody, {
    ...boxenStyles,
    title: mentionsYouHeading,
  });

  if (showReviewed) {
    createdByYouOutput = `${createdByYouOutput}\n${reviwedByYouOutput}`;
  }

  if (showMentioned) {
    createdByYouOutput = `${createdByYouOutput}\n${mentionsYouOutput}`;
  }

  // Create table data
  const tableData = [[requestingReviewOutput, createdByYouOutput]];

  // Render table
  const output = terminalColumns(tableData, [
    { width: columnWidth },
    { width: columnWidth },
  ]);

  console.log(output);
};
