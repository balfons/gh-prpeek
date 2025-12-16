import { program } from "commander";
import {
  createCliRenderer,
  BoxRenderable,
  ScrollBoxRenderable,
  dim,
  t,
  ConsolePosition,
  TabSelectOption,
  CliRenderer,
} from "@opentui/core";
import { formattedDateText, getPrRenderables } from "./src/utils/output.util";
import { TabMenuRenderable } from "./src/components/TabMenuRenderable";
import {
  fetchLatestRelease,
  fetchMentionedPrs,
  fetchMyPullRequests,
  fetchRequestingReviewPullRequests,
  fetchReviewedPrs,
} from "./src/commands";
import packageJson from "./package.json";
import { commaSeparatedList } from "./src/utils/terminal.util";
import {
  notifyFailingePrs,
  notifyMergablePrs,
  notifyNewCommentsPrs,
  notifyNewPrs,
} from "./src/notify";
import { PullRequest } from "./src/models/PullRequest";
import { Flags } from "./src/models/Flags";
import {
  cyan,
  getHexColor,
  green,
  setTerminalColorsFromTheme,
} from "./src/utils/color.util";
import { CommandsRenderable } from "./src/components/CommandsRenderable";
import { SpinnerRenderable } from "./src/components/SpinnerRenderable";
import { PullRequestRenderable } from "./src/components/PullRequestRenderable";
import { NewVersionRenderable } from "./src/components/NewVersionRenderable";

program
  .version(packageJson.version)
  .description(`Show status of relevant pull requests live`)
  .requiredOption(
    "-r, --repos <repos>",
    "Repositories to target: OWNER/REPO",
    commaSeparatedList
  )
  .option("-i, --interval <interval>", "Update interval in seconds", "30")
  .option(
    "-n, --notify",
    "Notification when a new PR is added or when one of your PRs becomes mergable",
    false
  )
  .option("--reviewed", "Show PRs that you have reviewed", false)
  .option("--mentioned", "Show PRs that mentions you", false)
  .option("--hide-checks", "Hide result of failing individual checks", false)
  .option(
    "-l, --labels <items>",
    "Only show pull requests that needs review from you with any of the specified labels",
    commaSeparatedList
  );

program.parse();

let mainContainer: ScrollBoxRenderable;
let tabMenu: TabMenuRenderable;
let lastUpdatedSpinnerText: SpinnerRenderable;
let statusContainer: BoxRenderable;
let newReleaseContainer: NewVersionRenderable;
let commands: CommandsRenderable;
let prRenderables: PullRequestRenderable[] = [];

let latestRelease: string | undefined;
let lastUpdatedDate: string = "Updating...";

let isLoading = false;
let hasHadFirstSuccessfulLoad = false;

const { repos, interval, notify, labels, reviewed, mentioned, hideChecks } =
  program.opts<Flags>();

const intervalAsMillis = Number(interval * 1000);

// const repoNames = formatRepoNames(repos);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

let previousPrs: PullRequest[] = [];
let myPreviousPrs: PullRequest[] = [];

let myPrs: PullRequest[] = [];
let requestingReviewPrs: PullRequest[] = [];
let reviewedPrs: PullRequest[] = [];
let mentionedPrs: PullRequest[] = [];

let timeout: Timer | undefined = undefined;

const createRenderables = async (renderer: CliRenderer) => {
  mainContainer = new ScrollBoxRenderable(renderer, {
    id: "main-container",
    zIndex: 10,
    position: "relative",
    width: "100%",
    overflow: "hidden",
    border: ["bottom", "right", "left"],
    borderColor: "gray",
    borderStyle: "rounded",
    paddingLeft: 2,
    paddingRight: 0,
    flexGrow: 1,
  });

  statusContainer = new BoxRenderable(renderer, {
    id: "status-container",
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    paddingLeft: 2,
    paddingRight: 2,
    height: 1,
  });

  latestRelease = await fetchLatestRelease();
  newReleaseContainer = new NewVersionRenderable(renderer, {
    id: "new-release-container",
    zIndex: 20,
    position: "absolute",
    width: 60,
    height: 8,
    top: renderer.height / 2 - 3,
    left: renderer.width / 2 - 30,
    alignItems: "center",
    flexDirection: "column",
    borderColor: getHexColor("magenta"),
    borderStyle: "rounded",
    padding: 1,
    backgroundColor: "transparent",
    bodyRows: [
      t`A new version of gh-prpeek is available: ${dim(
        packageJson.version
      )} → ${green(latestRelease ?? "")}`,
      t`Run ${cyan(`gh extension upgrade balfons/gh-prpeek`)} to update`,
    ],
    actionText: t`${dim(`Press the Enter key to continue...`)}`,
    actionKeyNames: ["enter", "return"],
  });

  tabMenu = new TabMenuRenderable({
    renderer,
    height: 3,
    position: "relative",
    left: 0,
    top: 0,
    menuBorderColor: "#808080",
    menuBackgroundColor: getHexColor("defaultBackground"),
    selectedOptionTextColor: getHexColor("magenta"),
    optionTextColor: getHexColor("white"),
    onSelectionChanged: () => rerender(),
    onItemSelected: () => rerender(),
  });

  lastUpdatedSpinnerText = new SpinnerRenderable(renderer, {
    id: "last-updated-spinner-text",
    text: t`[${green("✓")} ${dim(lastUpdatedDate)}]`,
    bg: getHexColor("defaultBackground"),
  });

  commands = new CommandsRenderable(renderer, {
    flexDirection: "row",
    flexWrap: "no-wrap",
    gap: 1,
    commands: [
      {
        key: "←/→",
        description: "Switch tab",
      },
      {
        key: "r",
        description: "Refresh",
        keyName: "r",
        action() {
          if (!isLoading) {
            console.log("Refreshing...");
            runProgram(false);
          }
        },
      },
      {
        key: "Ctrl+C",
        description: "Exit",
      },
    ],
  });

  renderer.root.add(tabMenu);
  renderer.root.add(mainContainer);
  statusContainer.add(lastUpdatedSpinnerText);
  statusContainer.add(commands);
  renderer.root.add(statusContainer);
};

const runProgram = async (firstRun: boolean) => {
  if (isLoading) return;

  if (timeout) {
    clearTimeout(timeout);
  }

  if (firstRun && latestRelease && latestRelease !== packageJson.version) {
    renderer.root.add(newReleaseContainer);
  }

  isLoading = true;
  lastUpdatedSpinnerText.startSpinner(lastUpdatedDate);

  const prsCreatedByMePromises = repos.map(fetchMyPullRequests);
  const prsRequestingReviewPromises = repos.map((repo) =>
    fetchRequestingReviewPullRequests(repo, labels ?? [])
  );
  const reviewedPromises = reviewed ? repos.map(fetchReviewedPrs) : [];
  const mentionedPromises = mentioned ? repos.map(fetchMentionedPrs) : [];

  try {
    [myPrs, requestingReviewPrs, reviewedPrs, mentionedPrs] = await Promise.all(
      [
        (await Promise.all(prsCreatedByMePromises)).flat(),
        (await Promise.all(prsRequestingReviewPromises)).flat(),
        (await Promise.all(reviewedPromises)).flat(),
        (await Promise.all(mentionedPromises)).flat(),
      ]
    );

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
      notifyFailingePrs(myPreviousPrs, myPrs);
      notifyNewCommentsPrs(myPreviousPrs, myPrs);
    }

    previousPrs = newPrs;
    myPreviousPrs = myPrs;

    setTabOptions({
      requestingReviewPrs,
      reviewedPrs,
      myPrs,
      mentionedPrs,
    });

    lastUpdatedDate = formattedDateText();
    isLoading = false;
    hasHadFirstSuccessfulLoad = true;
    lastUpdatedSpinnerText.stopSpinner(lastUpdatedDate);

    tabMenu.focus();
    rerender();
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    isLoading = false;
    lastUpdatedSpinnerText.stopSpinnerWithError(lastUpdatedDate);
  }

  timeout = setTimeout(() => runProgram(false), intervalAsMillis);
  timeout.unref();
};

const setTabOptions = ({
  requestingReviewPrs,
  reviewedPrs,
  myPrs,
  mentionedPrs,
}: {
  requestingReviewPrs: PullRequest[];
  reviewedPrs: PullRequest[];
  myPrs: PullRequest[];
  mentionedPrs: PullRequest[];
}) => {
  const options: TabSelectOption[] = [
    {
      name: `Requesting review (${requestingReviewPrs.length})`,
      description: "PRs needing your review",
      value: requestingReviewPrs,
    },
    ...(reviewed
      ? [
          {
            name: `Reviewed (${reviewedPrs.length})`,
            description: "PRs you have reviewed",
            value: reviewedPrs,
          },
        ]
      : []),
    {
      name: `Created by me (${myPrs.length})`,
      description: "PRs you have created",
      value: myPrs,
    },
    ...(mentioned
      ? [
          {
            name: `Mentions me (${mentionedPrs.length})`,
            description: "PRs mentioning you",
            value: mentionedPrs,
          },
        ]
      : []),
  ];
  tabMenu.setTabOptions(options);
};

const rerender = () => {
  const selectedOption = tabMenu.getSelectedOption();

  prRenderables.forEach((pr) => pr.destroyRecursively());

  prRenderables = getPrRenderables({
    renderer,
    pullRequests: selectedOption?.value || [],
    hideChecks,
  });
  prRenderables.forEach((pr) => mainContainer.add(pr));
};

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useConsole: true,
  enableMouseMovement: true,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    sizePercent: 50,
    startInDebugMode: true,
  },
  onDestroy: () => process.exit(0), // Until bun supports aborting shell promises: https://github.com/oven-sh/bun/issues/18247
});

await setTerminalColorsFromTheme(renderer);

await createRenderables(renderer);
setTabOptions({
  requestingReviewPrs: [],
  reviewedPrs: [],
  myPrs: [],
  mentionedPrs: [],
});

runProgram(true);
