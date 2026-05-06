import { program } from "commander";
import { createCliRenderer, ConsolePosition } from "@opentui/core";
import { formatRepoNames } from "./src/utils/output.util";
import {
  fetchMentionedPrs,
  fetchMyPullRequests,
  fetchRequestingReviewPullRequests,
  fetchReviewedPrs,
  fetchTeamMembers,
  getActiveGithubUser,
} from "./src/commands";
import packageJson from "./package.json";
import { commaSeparatedList } from "./src/utils/terminal.util";
import {
  notifyFailingPrs,
  notifyMergablePrs,
  notifyNewCommentsPrs,
  notifyNewPrs,
} from "./src/notify";
import { PullRequest } from "./src/models/PullRequest";
import { Flags } from "./src/models/Flags";
import { setTerminalColorsFromTheme } from "./src/utils/color.util";
import { prMocks } from "./src/mocks/mocks";
import chalk from "chalk";
import { User } from "./src/models/User";
import {
  validateInterval,
  validateRepositoryFormat,
  validateTeamMemberAmount,
  validateTeamName,
} from "./src/utils/option-validator.util";
import { SplashView } from "./src/views/splash.view";
import { AppView } from "./src/views/app.view";

program
  .version(packageJson.version)
  .description(`Show status of relevant pull requests live`)
  .requiredOption(
    "-r, --repos <repos>",
    `Repositories to target: ${chalk.yellow("OWNER/REPO")}`,
    commaSeparatedList,
  )
  .option("-i, --interval <interval>", "Update interval in seconds", "60")
  .option(
    "-n, --notify",
    "Notification when a new PR is added or when one of your PRs becomes mergable",
    true,
  )
  .option("--reviewed", "Show PRs that you have reviewed", true)
  .option("--mentioned", "Show PRs that mentions you", true)
  .option("--hide-checks", "Hide result of failing individual checks", false)
  .option("--show-labels", "Show labels on pull requests", false)
  .option("--debug", "Shows console output on error", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList,
  )
  .option(
    "-t, --team <team>",
    `Also shows PRs that has been reviewed by someone in your team: ${chalk.yellow("ORG/TEAM")}\nThis is useful if you are in a team where multiple people review the same PRs, so you can see PRs that has been approved by someone else in your team and are waiting for your review`,
    false,
  );

program.parse();

let isLoading = false;
let hasHadFirstSuccessfulLoad = false;

let teamMembers: User[] = [];

const {
  repos,
  interval,
  notify,
  labels,
  reviewed,
  mentioned,
  hideChecks,
  showLabels,
  debug,
  team,
} = program.opts<Flags>();

const intervalAsMillis = Number(interval) * 1000;

validateRepositoryFormat(program, repos);
validateInterval(program, intervalAsMillis);
const repoNames = formatRepoNames(repos);

const githubUser = await getActiveGithubUser();

if (team) {
  const { org, teamName } = validateTeamName(program, team);

  try {
    const members = await fetchTeamMembers(org, teamName);
    validateTeamMemberAmount(program, team, members);
    teamMembers = members.filter((member) => member.login !== githubUser.login);
  } catch (error) {
    program.error(`Failed to fetch team members for ${team}: ${error}`);
  }
}

const useMockData = process.env.USE_MOCK_DATA === "true";

let previousPrs: PullRequest[] = [];
let myPreviousPrs: PullRequest[] = [];

let timeout: Timer | undefined = undefined;

const runProgram = async (firstRun: boolean) => {
  if (isLoading) return;
  isLoading = true;
  setLoading();

  if (timeout) {
    clearTimeout(timeout);
  }

  const prsCreatedByMePromises = repos.map((repo) =>
    fetchMyPullRequests(repo, githubUser),
  );
  const prsRequestingReviewPromises = repos.map((repo) =>
    fetchRequestingReviewPullRequests(
      repo,
      labels ?? [],
      teamMembers,
      githubUser,
    ),
  );
  const reviewedPromises = reviewed
    ? repos.map((repo) => fetchReviewedPrs(repo, githubUser))
    : [];
  const mentionedPromises = mentioned
    ? repos.map((repo) => fetchMentionedPrs(repo, githubUser))
    : [];

  try {
    const [myPrs, requestingReviewPrs, reviewedPrs, mentionedPrs] =
      await Promise.all([
        Promise.all(prsCreatedByMePromises).then((prs) => prs.flat()),
        useMockData
          ? Promise.resolve(prMocks)
          : Promise.all(prsRequestingReviewPromises).then((prs) => prs.flat()),
        Promise.all(reviewedPromises).then((prs) => prs.flat()),
        Promise.all(mentionedPromises).then((prs) => prs.flat()),
      ]);

    const allPrs = [
      ...myPrs,
      ...requestingReviewPrs,
      ...reviewedPrs,
      ...mentionedPrs,
    ];
    console.log(`Fetched a total of ${allPrs.length} pull requests.`);
    const newPrs = [...myPrs, ...requestingReviewPrs];

    if (!firstRun && notify && hasHadFirstSuccessfulLoad) {
      notifyNewPrs(previousPrs, newPrs);
      notifyMergablePrs(myPreviousPrs, myPrs);
      notifyFailingPrs(myPreviousPrs, myPrs);
      notifyNewCommentsPrs(myPreviousPrs, myPrs);
    }

    previousPrs = newPrs;
    myPreviousPrs = myPrs;

    setLoadingSuccess();

    refreshAppView({
      requestingReviewPrs,
      reviewedPrs,
      myPrs,
      mentionedPrs,
    });
    /**
     * If the console was open due to a previous error, hide it after a successful load.
     * This usually happens due to connection issues or hitting the GitHub API rate limit.
     */

    if (!debug) {
      renderer.console.hide();
    }

    hasHadFirstSuccessfulLoad = true;
  } catch (error) {
    setLoadingError();

    if (debug) {
      renderer.console.show();
      console.error(error);
    }
  } finally {
    isLoading = false;
  }

  timeout = setTimeout(() => runProgram(false), intervalAsMillis);
  timeout.unref();
};

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  enableMouseMovement: true,
  autoFocus: false,
  openConsoleOnError: debug,
  consoleOptions: {
    position: ConsolePosition.TOP,
    sizePercent: 50,
  },
  onDestroy: () => process.exit(0), // Until bun supports aborting shell promises: https://github.com/oven-sh/bun/issues/18247
});

await setTerminalColorsFromTheme(renderer);

// Show splash screen while loading data for the first time
const { renderSplashScreen, destroySplashScreen } = await SplashView.create(
  renderer,
  { repoNames },
);
renderSplashScreen();
// Initialize the main renderables (tabs, containers, etc.)
const {
  renderAppView,
  refreshAppView,
  setLoading,
  setLoadingSuccess,
  setLoadingError,
} = new AppView(renderer, {
  onRefresh: () => runProgram(false),
  mentioned,
  hideChecks,
  showLabels,
  reviewed,
});

await runProgram(true);

// After the first successful load, destroy the splash screen and show the main app
destroySplashScreen();
renderAppView();
