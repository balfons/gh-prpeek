import chalk from "chalk";
import boxen from "boxen";
import { program } from "commander";
import ora from "ora";
import { createServer } from "node:net";
import {
  formatReposTitle,
  formattedDateText,
  formattedTextsCreatedByYou,
  formattedTextsInvolvingYou,
  formattedTextsRequestingReview,
} from "./src/utils/output.util";
import { fetchInvolvedPrs, fetchPrStatus } from "./src/commands";
import packageJson from "./package.json";
import {
  clearScreen,
  commaSeparatedList,
  disableAlternateBuffer,
  enableAlternateBuffer,
} from "./src/utils/terminal.util";
import { PullRequest } from "./src/types";
import {
  notifyFailingePrs,
  notifyMergablePrs,
  notifyNewCommentsPrs,
  notifyNewPrs,
} from "./src/notify";

program
  .version(packageJson.version)
  .description(`Show status of relevant pull requests live`)
  .requiredOption(
    "-r, --repos <repos>",
    "Repositories to target: OWNER/REPO",
    commaSeparatedList
  )
  .option("-i, --interval <interval>", "Update interval in seconds", "15")
  .option(
    "-n, --notify",
    "Notification when a new PR is added or when one of your PRs becomes mergable",
    false
  )
  .option("--involved", "Show additional PRs where you are involved", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

const { repos, interval, notify, labels, involved } = program.opts<{
  repos: string[];
  interval: number;
  notify: boolean;
  labels: string[];
  involved: boolean;
}>();

const intervalAsMillis = Number(interval * 1000);

const reposTitle = formatReposTitle(repos);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

// Spinner
const spinner = ora({
  suffixText: "Updating pull requests",
  color: "magenta",
});

let previousPrs: PullRequest[] = [];
let yourPreviousPrs: PullRequest[] = [];

enableAlternateBuffer();
clearScreen();

const server = createServer().listen(); // Keep script running

[
  `exit`,
  `SIGINT`,
  `SIGUSR1`,
  `SIGUSR2`,
  `uncaughtException`,
  `SIGTERM`,
].forEach((eventType) => {
  process.on(eventType, () => {
    server.close();
    disableAlternateBuffer();
  });
});

const runProgram = async (firstRun: boolean) => {
  spinner.start();

  const prStatusPromises = repos.map(fetchPrStatus);
  const involvedPromises = involved ? repos.map(fetchInvolvedPrs) : [];

  try {
    const [fetchPrStatusResponses, fetchPrSearchResponses] = await Promise.all([
      Promise.all(prStatusPromises),
      Promise.all(involvedPromises),
    ]);

    spinner.stop();
    clearScreen();

    // Created by you
    const { createdByHeading, prsCreatedByYou, prsCreatedByYouText } =
      formattedTextsCreatedByYou(fetchPrStatusResponses);

    // Requesting review
    const {
      requestingReviewHeading,
      prsRequestingReview,
      prsRequestingReviewText,
    } = formattedTextsRequestingReview(fetchPrStatusResponses, labels);

    // Involving you
    const { invlovedHeading, prsInvolvingYouText } = formattedTextsInvolvingYou(
      fetchPrSearchResponses,
      prsCreatedByYou,
      prsRequestingReview
    );

    const date = chalk.dim(`Last updated: ${formattedDateText()}`);

    let output = `${createdByHeading}\n${prsCreatedByYouText}\n\n${requestingReviewHeading}\n${prsRequestingReviewText}`;

    if (involved) {
      output = `${output}\n\n${invlovedHeading}\n${prsInvolvingYouText}`;
    }

    output = `${output}\n\n${date}`;

    const prs = [...prsCreatedByYou, ...prsRequestingReview];

    if (!firstRun && notify) {
      notifyNewPrs(previousPrs, prs);
      notifyMergablePrs(yourPreviousPrs, prsCreatedByYou);
      notifyFailingePrs(yourPreviousPrs, prsCreatedByYou);
      notifyNewCommentsPrs(yourPreviousPrs, prsCreatedByYou);
    }

    previousPrs = prs;
    yourPreviousPrs = prsCreatedByYou;

    console.log(
      boxen(output, {
        padding: 1,
        borderColor: "magenta",
        borderStyle: "round",
        title: reposTitle,
      })
    );

    setTimeout(() => runProgram(false), intervalAsMillis).unref(); // unref to not block main thread
  } catch (e) {
    spinner.stop();
    server.close();
    disableAlternateBuffer();
    throw e;
  }
};

runProgram(true);
