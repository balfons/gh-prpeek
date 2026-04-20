import { program } from "commander";
import {
  createCliRenderer,
  BoxRenderable,
  ScrollBoxRenderable,
  dim,
  t,
  ConsolePosition,
  CliRenderer,
  StyledText,
  TextRenderable,
} from "@opentui/core";
import {
  formatRepoNames,
  formattedDateText,
  getPrRenderables,
} from "./src/utils/output.util";
import {
  TabMenuRenderable,
  TabOption,
} from "./src/components/TabMenuRenderable";
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
  notifyFailingPrs,
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
import { SplashScreenRenderable } from "./src/components/SplashScreenRenderable";
import open from "open";
import { prMocks } from "./src/mocks/mocks";

program
  .version(packageJson.version)
  .description(`Show status of relevant pull requests live`)
  .requiredOption(
    "-r, --repos <repos>",
    "Repositories to target: OWNER/REPO",
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
  );

program.parse();

let prListContainer: ScrollBoxRenderable;
let tabMenu: TabMenuRenderable;
let lastUpdatedSpinnerText: SpinnerRenderable;
let statusContainer: BoxRenderable;
let splashScreen: SplashScreenRenderable;
let commands: CommandsRenderable;
let prRenderables: PullRequestRenderable[] = [];
let selectedPrIndex: number = -1;

let versionText: TextRenderable;

let latestRelease: string | undefined;
let lastUpdatedDate: string = "Updating...";

let isLoading = false;
let hasHadFirstSuccessfulLoad = false;

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
} = program.opts<Flags>();

const intervalAsMillis = Number(interval * 1000);

const repoNames = formatRepoNames(repos);

const invalidRepos = repos.filter((r) => !/^[^/]+\/[^/]+$/.test(r.trim()));
if (invalidRepos.length > 0) {
  program.error(
    `Invalid repo format: ${invalidRepos.join(", ")}. Expected OWNER/REPO`,
  );
}

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

let useMockData = process.env.USE_MOCK_DATA === "true";

let previousPrs: PullRequest[] = [];
let myPreviousPrs: PullRequest[] = [];

let myPrs: PullRequest[] = [];
let requestingReviewPrs: PullRequest[] = [];
let reviewedPrs: PullRequest[] = [];
let mentionedPrs: PullRequest[] = [];

let timeout: Timer | undefined = undefined;

const initSplashScreen = async (renderer: CliRenderer) => {
  latestRelease = await fetchLatestRelease();

  let bodyRows: StyledText[] = [
    t`${green(`Fetching prs for: ${repoNames.join(", ")}`)}`,
  ];
  if (latestRelease && latestRelease !== packageJson.version) {
    bodyRows = [
      ...bodyRows,
      t``,
      t`A new version of gh-prpeek is available: ${dim(
        packageJson.version,
      )} → ${green(latestRelease ?? "")}`,
      t`Run ${cyan(`gh extension upgrade balfons/gh-prpeek`)} to update`,
    ];
  }

  splashScreen = new SplashScreenRenderable(renderer, {
    id: "splash-screen",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
    asciiText: "prpeek",
    bodyRows,
  });

  return {
    render() {
      renderer.root.add(splashScreen);
    },
    destroy() {
      splashScreen.destroy();
    },
  };
};

const initAppRenderables = (renderer: CliRenderer) => {
  prListContainer = new ScrollBoxRenderable(renderer, {
    id: "main-container",
    zIndex: 10,
    position: "relative",
    width: "100%",
    overflow: "hidden",
    border: ["bottom", "right", "left"],
    borderColor: "gray",
    borderStyle: "rounded",
    focusable: false,
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
    onSelectionChanged: () => {
      selectedPrIndex = -1;
      rerender();
    },
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
        key: "↑/↓",
        description: "Navigate PRs",
        keyName: "up",
        action() {
          if (prRenderables.length === 0) return;
          const prev = selectedPrIndex;
          if (prev <= 0) {
            selectedPrIndex = 0;
          } else {
            selectedPrIndex = prev - 1;
          }
          if (prev !== selectedPrIndex) {
            if (prev >= 0) prRenderables[prev].setSelected(false);
            prRenderables[selectedPrIndex].setSelected(true);
            prListContainer.scrollChildIntoView(
              prRenderables[selectedPrIndex].id,
            );
          }
        },
      },
      {
        key: "",
        description: "",
        keyName: "down",
        action() {
          if (prRenderables.length === 0) return;
          const prev = selectedPrIndex;
          selectedPrIndex = Math.min(
            prRenderables.length - 1,
            selectedPrIndex + 1,
          );
          if (prev !== selectedPrIndex) {
            if (prev >= 0 && prev < prRenderables.length) {
              prRenderables[prev].setSelected(false);
            }
            prRenderables[selectedPrIndex].setSelected(true);
            prListContainer.scrollChildIntoView(
              prRenderables[selectedPrIndex].id,
            );
          }
        },
      },
      {
        key: "↵",
        description: "Open PR",
        keyName: "return",
        action() {
          if (selectedPrIndex < 0 || selectedPrIndex >= prRenderables.length)
            return;
          open(prRenderables[selectedPrIndex].prUrl);
        },
      },
      {
        key: "r",
        description: "Refresh",
        keyName: "r",
        action() {
          console.log("Refreshing...");
          runProgram(false);
        },
      },
      {
        key: "Ctrl+C",
        description: "Exit",
      },
    ],
  });

  versionText = new TextRenderable(renderer, {
    id: "version-text",
    content: t`${packageJson.version}`,
    fg: "gray",
    bg: getHexColor("defaultBackground"),
    position: "absolute",
    right: 2,
    top: 1,
  });

  return {
    render() {
      renderer.root.add(tabMenu);
      renderer.root.add(prListContainer);
      statusContainer.add(lastUpdatedSpinnerText);
      statusContainer.add(commands);
      renderer.root.add(statusContainer);
      renderer.root.add(versionText);
      tabMenu.focus();
    },
  };
};

const runProgram = async (firstRun: boolean) => {
  if (isLoading) return;
  isLoading = true;

  if (timeout) {
    clearTimeout(timeout);
  }

  lastUpdatedSpinnerText.startSpinner(lastUpdatedDate);

  const prsCreatedByMePromises = repos.map(fetchMyPullRequests);
  const prsRequestingReviewPromises = repos.map((repo) =>
    fetchRequestingReviewPullRequests(repo, labels ?? []),
  );
  const reviewedPromises = reviewed ? repos.map(fetchReviewedPrs) : [];
  const mentionedPromises = mentioned ? repos.map(fetchMentionedPrs) : [];

  try {
    [myPrs, requestingReviewPrs, reviewedPrs, mentionedPrs] = await Promise.all(
      [
        Promise.all(prsCreatedByMePromises).then((prs) => prs.flat()),
        useMockData
          ? Promise.resolve(prMocks)
          : Promise.all(prsRequestingReviewPromises).then((prs) => prs.flat()),
        Promise.all(reviewedPromises).then((prs) => prs.flat()),
        Promise.all(mentionedPromises).then((prs) => prs.flat()),
      ],
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
      notifyFailingPrs(myPreviousPrs, myPrs);
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
    /**
     * If the console was open due to a previous error, hide it after a successful load.
     * This usually happens due to connection issues or hitting the GitHub API rate limit.
     */

    if (!debug) {
      renderer.console.hide();
    }
  } catch (error) {
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
  const options: TabOption[] = [
    {
      name: `Requesting review`,
      count: requestingReviewPrs.length,
      description: "PRs needing your review",
      value: requestingReviewPrs,
    },
    {
      name: `Reviewed`,
      count: reviewedPrs.length,
      description: "PRs you have reviewed",
      value: reviewedPrs,
      hidden: !reviewed,
    },
    {
      name: `Created by me`,
      count: myPrs.length,
      description: "PRs you have created",
      value: myPrs,
    },
    {
      name: `Mentions me`,
      count: mentionedPrs.length,
      description: "PRs mentioning you",
      value: mentionedPrs,
      hidden: !mentioned,
    },
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
    showLabels,
  });
  prRenderables.forEach((pr) => prListContainer.add(pr));

  if (selectedPrIndex >= 0 && selectedPrIndex < prRenderables.length) {
    prRenderables[selectedPrIndex].setSelected(true);
  }
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
const splashScreenInstance = await initSplashScreen(renderer);
splashScreenInstance.render();
// Initialize the main renderables (tabs, containers, etc.)
const appRenderables = initAppRenderables(renderer);
await runProgram(true);

// After the first successful load, destroy the splash screen and show the main app
splashScreenInstance.destroy();
appRenderables.render();
