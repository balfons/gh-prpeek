import terminalLink from "terminal-link";
import chalk from "chalk";
import boxen from "boxen";
import { Command } from "commander";
import beeper from "beeper";
import ora from "ora";
import { PullRequest, PullRequestStatusResponse } from "./types";
const program = new Command();

const commaSeparatedList = (value: string) => {
  return value.toLowerCase().split(",");
};

program
  .description("Show status of relevant pull requests live")
  .requiredOption("-r, --repo <repo>", "Repository to target: OWNER/REPO")
  .option("-i, --interval <interval>", "Update interval in seconds", "10")
  .option("-s, --sound", "Sound when a new PR is added", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

const spinner = ora({
  suffixText: "Updating pull requests",
  color: "magenta",
});

const { repo, interval, sound, labels } = program.opts();

const intervalAsMillis = Number(interval * 1000);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

const fetchPrStatus = async (
  repo: string
): Promise<PullRequestStatusResponse> => {
  const repoUrl = `https://github.com/${repo}`;
  const env = { ...process.env, GH_PAGER: "" };
  const ghPrCommand = [
    "gh",
    "pr",
    "status",
    "--repo",
    repoUrl,
    "--json",
    "title,url,number,headRefName,statusCheckRollup,isDraft,reviewDecision,labels,author,additions,deletions",
  ];
  try {
    const process = Bun.spawnSync(ghPrCommand, {
      env,
    });

    const error = await new Response(process.stderr).text();
    if (error) {
      throw error;
    } else {
      return new Response(process.stdout).json();
    }
  } catch (error: any) {
    if (error.code === "ERR_INVALID_ARG_TYPE") {
      throw "GitHub CLI needs to be installed in order to run prpeek: https://github.com/cli/cli#installation";
    } else {
      throw error;
    }
  }
};

const getDate = () => {
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

const getStatusCheck = ({ statusCheckRollup }: PullRequest) => {
  const isSuccessful = statusCheckRollup.every(
    (statusCheck) =>
      statusCheck.status === "COMPLETED" && statusCheck.conclusion === "SUCCESS"
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

const getFailedChecksText = (
  statusCheckRollup: PullRequest["statusCheckRollup"]
) => {
  const failedChecks = getFailedChecks(statusCheckRollup);
  const indent = "\n      ";

  return failedChecks.length > 0
    ? `${indent}${failedChecks
        .map((check) =>
          chalk.redBright(
            terminalLink(check.name, check.detailsUrl, { fallback: false })
          )
        )
        .join(indent)}`
    : "";
};

const getReviewDecisionText = (
  reviewDecision: PullRequest["reviewDecision"]
) => {
  if (reviewDecision === "APPROVED") {
    return chalk.green("Approved");
  } else if (reviewDecision === "REVIEW_REQUIRED") {
    return chalk.yellow("Review required");
  } else {
    return "";
  }
};

const getAdditionsDeletionsText = (pr: PullRequest) => {
  const additions = chalk.green(`+${pr.additions}`);
  const deletions = chalk.red(`-${pr.deletions}`);
  return `[${additions} ${deletions}]`;
};

const formatPrText = (pullRequest: PullRequest) => {
  const prNumber = pullRequest.isDraft
    ? chalk.dim(`#${pullRequest.number}`)
    : chalk.green(`#${pullRequest.number}`);
  const title = terminalLink(pullRequest.title, pullRequest.url, {
    fallback: false,
  });
  const author = chalk.blue(`[${pullRequest.author.name}]`);
  const statusCheck = getStatusCheck(pullRequest);
  const reviewDecision = getReviewDecisionText(pullRequest.reviewDecision);
  const failedChecksText = getFailedChecksText(pullRequest.statusCheckRollup);
  const additionsAndDeletions = getAdditionsDeletionsText(pullRequest);

  return `${prNumber} ${title} ${additionsAndDeletions} ${author}\n    ${statusCheck} - ${reviewDecision}${failedChecksText}`;
};

let previousPrNumbers: number[] = [];

while (true) {
  spinner.start();

  try {
    const fetchPrStatusResponse: PullRequestStatusResponse =
      await fetchPrStatus(repo);
    spinner.stop();
    console.clear();

    const prsCreatedByYou = fetchPrStatusResponse.createdBy
      .map((pr) => `  ${formatPrText(pr)}`)
      .join("\n");
    const prsRequestingReview = fetchPrStatusResponse.needsReview
      .filter(
        (pr) =>
          !labels ||
          pr.labels.some((label) => labels.includes(label.name.toLowerCase()))
      )
      .map((pr) => `  ${formatPrText(pr)}`)
      .join("\n");
    const createdByHeading = chalk.bold("Created by you:");
    const requestingReviewHeading = chalk.bold(
      "Requesting a code review from you:"
    );
    const date = chalk.dim(`Last updated: ${getDate()}`);

    const output = `${createdByHeading}\n${prsCreatedByYou}\n\n${requestingReviewHeading}\n${prsRequestingReview}\n\n${date}`;

    const prNumbers = [
      ...fetchPrStatusResponse.createdBy,
      ...fetchPrStatusResponse.needsReview,
    ].map(({ number }) => number);
    const hasNewPr = prNumbers.some(
      (prNumber) => !previousPrNumbers.includes(prNumber)
    );

    if (sound && hasNewPr) {
      await beeper("**");
    }

    previousPrNumbers = prNumbers;

    console.log(
      boxen(output, {
        padding: 1,
        borderColor: "magenta",
        borderStyle: "round",
        title: repo,
      })
    );

    await Bun.sleep(intervalAsMillis);
  } catch (e) {
    spinner.stop();
    console.log(e);
    break;
  }
}
