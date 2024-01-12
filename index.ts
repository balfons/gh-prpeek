import chalk from "chalk";
import boxen from "boxen";
import { Command } from "commander";
import beeper from "beeper";
import ora from "ora";
import nodeCleanup from "node-cleanup";
import { PullRequestStatusResponse, BasePullRequest } from "./types";
import {
  formattedDateText,
  formattedTextsCreatedByYou,
  formattedTextsInvolvingYou,
  formattedTextsRequestingReview,
} from "./textFormatter";
import { fetchInvolvedPrs, fetchPrStatus } from "./commands";
import {
  clearScreen,
  commaSeparatedList,
  disableAlternateBuffer,
  enableAlternateBuffer,
} from "./utils";

// Program setup
const program = new Command();

program
  .description(`Show status of relevant pull requests live`)
  .requiredOption("-r, --repo <repo>", "Repository to target: OWNER/REPO")
  .option("-i, --interval <interval>", "Update interval in seconds", "10")
  .option("-s, --sound", "Sound when a new PR is added", false)
  .option("--involved", "Show additional PRs where you are involved", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

const { repo, interval, sound, labels, involved } = program.opts();

const intervalAsMillis = Number(interval * 1000);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

// Spinner
const spinner = ora({
  suffixText: "Updating pull requests",
  color: "magenta",
});

let previousPrNumbers: number[] = [];

enableAlternateBuffer();
clearScreen();
nodeCleanup((exitCode) => {
  disableAlternateBuffer()
});

const shouldPlaySound = (prNumbers: number[]) => {
  const hasNewPr = prNumbers.some(
    (prNumber) => !previousPrNumbers.includes(prNumber)
  );

  return sound && hasNewPr;
};

while (true) {
  spinner.start();
  const promises: [
    Promise<PullRequestStatusResponse>,
    ...Promise<BasePullRequest[]>[]
  ] = [fetchPrStatus(repo), ...(involved ? [fetchInvolvedPrs(repo)] : [])];

  try {
    const [fetchPrStatusResponse, fetchPrSearchResponse] = await Promise.all<
      [
        Promise<PullRequestStatusResponse>,
        ...(Promise<BasePullRequest[]>[] | undefined[])
      ]
    >(promises);
    spinner.stop();
    clearScreen();

    // Created by you
    const { createdByHeading, prsCreatedByYou, prsCreatedByYouText } =
      formattedTextsCreatedByYou(fetchPrStatusResponse);

    // Requesting review
    const {
      requestingReviewHeading,
      prsRequestingReview,
      prsRequestingReviewText,
    } = formattedTextsRequestingReview(fetchPrStatusResponse, labels);

    // Involving you
    const { invlovedHeading, prsInvolvingYou, prsInvolvingYouText } =
      formattedTextsInvolvingYou(
        fetchPrSearchResponse,
        prsCreatedByYou,
        prsRequestingReview
      );

    const date = chalk.dim(`Last updated: ${formattedDateText()}`);

    let output = `${createdByHeading}\n${prsCreatedByYouText}\n\n${requestingReviewHeading}\n${prsRequestingReviewText}`;

    if (involved) {
      output = `${output}\n\n${invlovedHeading}\n${prsInvolvingYouText}`;
    }

    output = `${output}\n\n${date}`;

    const prNumbers = [
      ...prsCreatedByYou,
      ...prsRequestingReview,
      ...(prsInvolvingYou || []),
    ].map(({ number }) => number);

    if (shouldPlaySound(prNumbers)) {
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
  } catch (e) {
    spinner.stop();
    disableAlternateBuffer();
    throw e;
  }
  await Bun.sleep(intervalAsMillis);
}
