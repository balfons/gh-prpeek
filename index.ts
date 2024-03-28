import chalk from "chalk";
import boxen from "boxen";
import { Command } from "commander";
import beeper from "beeper";
import ora from "ora";
import nodeCleanup from "node-cleanup";
import {
  formattedDateText,
  formattedTextsCreatedByYou,
  formattedTextsInvolvingYou,
  formattedTextsRequestingReview,
} from "./src/textFormatter";
import { fetchInvolvedPrs, fetchPrStatus } from "./src/commands";
import {
  clearScreen,
  commaSeparatedList,
  disableAlternateBuffer,
  enableAlternateBuffer,
} from "./src/utils";

// Program setup
const program = new Command();

program
  .version('2.0.0')
  .description(`Show status of relevant pull requests live`)
  .requiredOption(
    "-r, --repos <repos>",
    "Repositories to target: OWNER/REPO",
    commaSeparatedList
  )
  .option("-i, --interval <interval>", "Update interval in seconds", "15")
  .option("-s, --sound", "Sound when a new PR is added", false)
  .option("--involved", "Show additional PRs where you are involved", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

const { repos, interval, sound, labels, involved } = program.opts<{
  repos: string[];
  interval: number;
  sound: boolean;
  labels: string[];
  involved: boolean;
}>();

const intervalAsMillis = Number(interval * 1000);

const repoNames = repos.map((repo) => repo.split("/").pop());

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

// Spinner
const spinner = ora({
  suffixText: "Updating pull requests",
  color: "magenta",
});

type PreviousPr = { number: number; repo?: string };

let previousPrs: PreviousPr[] = [];

enableAlternateBuffer();
clearScreen();

nodeCleanup((exitCode, message) => {
  disableAlternateBuffer();
});

const shouldPlaySound = (prs: PreviousPr[]) => {
  const hasNewPr = prs.some(
    (pr) =>
      !previousPrs.some(
        ({ number, repo }) => pr.number === number && pr.repo === repo
      )
  );

  return sound && hasNewPr;
};

export const runProgram = async (firstRun: boolean) => {
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
    const { invlovedHeading, prsInvolvingYou, prsInvolvingYouText } =
      formattedTextsInvolvingYou(
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

    const prs = [
      ...prsCreatedByYou,
      ...prsRequestingReview,
      ...(prsInvolvingYou || []),
    ].map(({ number, headRepository, repository }) => ({
      number,
      repo: headRepository?.name ?? repository?.name,
    }));

    if (!firstRun && shouldPlaySound(prs)) {
      beeper("**");
    }

    previousPrs = prs;

    console.log(
      boxen(output, {
        padding: 1,
        borderColor: "magenta",
        borderStyle: "round",
        title: repoNames.join(" • "),
      })
    );
  } catch (e) {
    spinner.stop();
    disableAlternateBuffer();
    throw e;
  }
};

runProgram(true);

setInterval(() => runProgram(false), intervalAsMillis);
