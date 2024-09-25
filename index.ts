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
  getUpgradeMessage,
} from "./src/utils/output.util";
import {
  fetchInvolvedPrs,
  fetchLatestRelease,
  fetchPrStatus,
} from "./src/commands";
import packageJson from "./package.json";
import {
  clearScreen,
  commaSeparatedList,
  disableAlternateBuffer,
  enableAlternateBuffer,
} from "./src/utils/terminal.util";
import {
  notifyFailingePrs,
  notifyMergablePrs,
  notifyNewCommentsPrs,
  notifyNewPrs,
} from "./src/notify";
import { PullRequest } from "./src/models/PullRequest";

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

[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(
  (eventType) => {
    process.on(eventType, () => {
      spinner.stop();
      server.close();
      disableAlternateBuffer();
      console.log(eventType);
      process.exit();
    });
  }
);

const runProgram = async (firstRun: boolean) => {
  if (firstRun) {
    const latestRelease = await fetchLatestRelease();

    if (latestRelease && latestRelease !== packageJson.version) {
      console.log(
        boxen(getUpgradeMessage(packageJson.version, latestRelease), {
          padding: 1,
          align: "center",
          borderColor: "magenta",
          borderStyle: "round",
        })
      );
      const result = prompt("Press Enter to skip...");
      console.log(result);
      clearScreen();
    }
  }

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
      formattedTextsCreatedByYou(
        fetchPrStatusResponses.flatMap((response) => response.createdBy)
      );

    // Requesting review
    const {
      requestingReviewHeading,
      prsRequestingReview,
      prsRequestingReviewText,
    } = formattedTextsRequestingReview(
      fetchPrStatusResponses.flatMap((response) => response.needsReview),
      labels
    );

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
