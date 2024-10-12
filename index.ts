import chalk from "chalk";
import boxen from "boxen";
import { program } from "commander";
import ora from "ora";
import { createServer } from "node:net";
import {
  formatRepoNames,
  formattedDateText,
  getUpgradeMessage,
  renderOutput,
} from "./src/utils/output.util";
import {
  fetchLatestRelease,
  fetchMyPullRequests,
  fetchRequestingReviewPullRequests,
  fetchReviewedPrs,
} from "./src/commands";
import packageJson from "./package.json";
import {
  clearScreen,
  commaSeparatedList,
  enableAlternateBuffer,
} from "./src/utils/terminal.util";
import {
  notifyFailingePrs,
  notifyMergablePrs,
  notifyNewCommentsPrs,
  notifyNewPrs,
} from "./src/notify";
import { PullRequest } from "./src/models/PullRequest";
import { registerProcessEvents } from "./src/processEvents";

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
  .option("--reviewed", "Show PRs that you have reviewed", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

const { repos, interval, notify, labels, reviewed } = program.opts<{
  repos: string[];
  interval: number;
  notify: boolean;
  labels?: string[];
  reviewed: boolean;
}>();

const intervalAsMillis = Number(interval * 1000);

const repoNames = formatRepoNames(repos);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

// Spinner
const spinner = ora({
  suffixText: `Fetching pull requests from:\n   ${repoNames.join(", ")}`,
  color: "magenta",
});

let previousPrs: PullRequest[] = [];
let myPreviousPrs: PullRequest[] = [];

let myPrs: PullRequest[] = [];
let requestingReviewPrs: PullRequest[] = [];
let reviewedPrs: PullRequest[] = [];

enableAlternateBuffer();
clearScreen();

// Keep script running
const server = createServer().listen();

// Register process event to handle errors and exiting
registerProcessEvents(server, spinner);

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
      prompt("Press Enter to skip...");
      clearScreen();
    }
  }

  spinner.start();

  const prsCreatedByMePromises = repos.map(fetchMyPullRequests);
  const prsRequestingReviewPromises = repos.map((repo) =>
    fetchRequestingReviewPullRequests(repo, labels ?? [])
  );
  const reviewedPromises = reviewed ? repos.map(fetchReviewedPrs) : [];

  [myPrs, requestingReviewPrs, reviewedPrs] = await Promise.all([
    (await Promise.all(prsCreatedByMePromises)).flat(),
    (await Promise.all(prsRequestingReviewPromises)).flat(),
    (await Promise.all(reviewedPromises)).flat(),
  ]);

  spinner.stop();
  clearScreen();

  const date = chalk.dim(`Last updated: ${formattedDateText()}`);

  const newPrs = [...myPrs, ...requestingReviewPrs];

  if (!firstRun && notify) {
    notifyNewPrs(previousPrs, newPrs);
    notifyMergablePrs(myPreviousPrs, myPrs);
    notifyFailingePrs(myPreviousPrs, myPrs);
    notifyNewCommentsPrs(myPreviousPrs, myPrs);
  }

  previousPrs = newPrs;
  myPreviousPrs = myPrs;

  renderOutput({
    myPrs,
    requestingReviewPrs,
    reviewedPrs,
    showReviewed: reviewed,
  });
  console.log(date);

  setTimeout(() => runProgram(false), intervalAsMillis).unref(); // unref to not block main thread
};

runProgram(true).then(() => {
  process.stdout.on("resize", () => {
    clearScreen();
    renderOutput({
      myPrs,
      requestingReviewPrs,
      reviewedPrs,
      showReviewed: reviewed,
    });
  });
});
