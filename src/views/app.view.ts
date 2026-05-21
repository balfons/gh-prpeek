import {
  BoxRenderable,
  CliRenderer,
  dim,
  green,
  ScrollBoxRenderable,
  t,
  TextRenderable,
} from "@opentui/core";
import open from "open";
import {
  TabMenuRenderable,
  type TabOption,
} from "../components/TabMenuRenderable";
import { SpinnerRenderable } from "../components/SpinnerRenderable";
import { CommandsRenderable } from "../components/CommandsRenderable";
import { PullRequestRenderable } from "../components/PullRequestRenderable";
import { brightBlack, getHexColor } from "../utils/color.util";
import packageJson from "../../package.json";
import type { PullRequest } from "../models/PullRequest";
import { formattedDateText, getPrRenderables } from "../utils/output.util";

interface PrCollections {
  requestingReviewPrs: PullRequest[];
  reviewedPrs: PullRequest[];
  myPrs: PullRequest[];
  mentionedPrs: PullRequest[];
}

interface AppViewOptions {
  onRefresh: () => void | Promise<void>;
  reviewed: boolean;
  mentioned: boolean;
  hideChecks: boolean;
  showLabels: boolean;
}

class AppView {
  private prListContainer: ScrollBoxRenderable;
  private statusContainer: BoxRenderable;
  private commands: CommandsRenderable;
  private versionText: TextRenderable;
  private prRenderables: PullRequestRenderable[] = [];
  private selectedPrIndex = -1;

  private state: PrCollections = {
    requestingReviewPrs: [],
    reviewedPrs: [],
    myPrs: [],
    mentionedPrs: [],
  };

  private tabMenu: TabMenuRenderable;
  private lastUpdatedSpinnerText: SpinnerRenderable;
  private lastUpdatedDate: string;
  onRefresh: () => void | Promise<void>;

  constructor(
    private renderer: CliRenderer,
    private options: AppViewOptions,
  ) {
    this.onRefresh = options.onRefresh;

    this.lastUpdatedDate = "Updating...";

    this.prListContainer = new ScrollBoxRenderable(renderer, {
      id: "main-container",
      zIndex: 10,
      position: "relative",
      width: "100%",
      overflow: "hidden",
      border: ["bottom", "right", "left"],
      borderColor: getHexColor("brightBlack"),
      borderStyle: "rounded",
      focusable: false,
      paddingLeft: 2,
      paddingRight: 0,
      flexGrow: 1,
    });

    this.statusContainer = new BoxRenderable(renderer, {
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

    this.tabMenu = new TabMenuRenderable({
      renderer,
      height: 3,
      position: "relative",
      left: 0,
      top: 0,
      menuBorderColor: getHexColor("brightBlack"),
      selectedOptionTextColor: getHexColor("magenta"),
      optionTextColor: getHexColor("fgText"),
      onSelectionChanged: () => {
        this.selectedPrIndex = -1;
        this.refreshAppView(this.state);
      },
      onItemSelected: () => this.refreshAppView(this.state),
    });

    this.lastUpdatedSpinnerText = new SpinnerRenderable(renderer, {
      id: "last-updated-spinner-text",
      text: t`[${green("✓")} ${brightBlack("Updating...")}]`,
    });

    this.commands = new CommandsRenderable(renderer, {
      flexDirection: "row",
      flexWrap: "no-wrap",
      gap: 1,
      commands: [
        { key: "←/→", description: "Switch tab" },
        {
          key: "↑/↓",
          description: "Navigate PRs",
          keyName: "up",
          action: () => this.navigateUp(),
        },
        {
          key: "",
          description: "",
          keyName: "down",
          action: () => this.navigateDown(),
        },
        {
          key: "↵",
          description: "Open PR",
          keyName: "return",
          action: () => this.openSelectedPr(),
        },
        {
          key: "r",
          description: "Refresh",
          keyName: "r",
          action: () => {
            void this.onRefresh();
          },
        },
        { key: "Ctrl+C", description: "Exit" },
      ],
    });

    this.versionText = new TextRenderable(renderer, {
      id: "version-text",
      content: t`${packageJson.version}`,
      fg: getHexColor("brightBlack"),
      position: "absolute",
      right: 2,
      top: 1,
    });
  }

  setLoading = () => {
    this.lastUpdatedSpinnerText.startSpinner(this.lastUpdatedDate);
  };

  setLoadingSuccess = () => {
    this.lastUpdatedDate = formattedDateText();
    this.lastUpdatedSpinnerText.stopSpinner(this.lastUpdatedDate);
  };

  setLoadingError = () => {
    this.lastUpdatedSpinnerText.stopSpinnerWithError(this.lastUpdatedDate);
  };

  renderAppView = () => {
    this.renderer.root.add(this.tabMenu);
    this.renderer.root.add(this.prListContainer);
    this.statusContainer.add(this.lastUpdatedSpinnerText);
    this.statusContainer.add(this.commands);
    this.renderer.root.add(this.statusContainer);
    this.renderer.root.add(this.versionText);
    this.tabMenu.focus();
    this.refreshAppView(this.state);
  };

  refreshAppView = (collections: PrCollections) => {
    this.tabMenu.focus();
    this.state = collections;

    this.setTabOptions(collections);
    const selectedOption = this.tabMenu.getSelectedOption();

    this.prRenderables.forEach((pr) => pr.destroyRecursively());

    this.prRenderables = getPrRenderables({
      renderer: this.renderer,
      pullRequests: selectedOption?.value || [],
      hideChecks: this.options.hideChecks,
      showLabels: this.options.showLabels,
    });
    this.prRenderables.forEach((pr) => this.prListContainer.add(pr));

    if (
      this.selectedPrIndex >= 0 &&
      this.selectedPrIndex < this.prRenderables.length
    ) {
      this.prRenderables[this.selectedPrIndex]?.setSelected(true);
    }
  };

  private setTabOptions({
    requestingReviewPrs,
    reviewedPrs,
    myPrs,
    mentionedPrs,
  }: PrCollections) {
    const options: TabOption[] = [
      {
        name: "Requesting review",
        count: requestingReviewPrs.length,
        description: "PRs needing your review",
        value: requestingReviewPrs,
      },
      {
        name: "Reviewed",
        count: reviewedPrs.length,
        description: "PRs you have reviewed",
        value: reviewedPrs,
        hidden: !this.options.reviewed,
      },
      {
        name: "Created by me",
        count: myPrs.length,
        description: "PRs you have created",
        value: myPrs,
      },
      {
        name: "Mentions me",
        count: mentionedPrs.length,
        description: "PRs mentioning you",
        value: mentionedPrs,
        hidden: !this.options.mentioned,
      },
    ];
    this.tabMenu.setTabOptions(options);
  }

  private navigateUp() {
    if (this.prRenderables.length === 0) return;
    const prev = this.selectedPrIndex;
    this.selectedPrIndex = Math.max(0, prev - 1);
    if (prev !== this.selectedPrIndex) {
      if (prev >= 0) this.prRenderables[prev]?.setSelected(false);
      this.prRenderables[this.selectedPrIndex]?.setSelected(true);
      this.prListContainer.scrollChildIntoView(
        this.prRenderables[this.selectedPrIndex]!.id,
      );
    }
  }

  private navigateDown() {
    if (this.prRenderables.length === 0) return;
    const prev = this.selectedPrIndex;
    this.selectedPrIndex = Math.min(
      this.prRenderables.length - 1,
      this.selectedPrIndex + 1,
    );
    if (prev !== this.selectedPrIndex) {
      if (prev >= 0 && prev < this.prRenderables.length) {
        this.prRenderables[prev]?.setSelected(false);
      }
      this.prRenderables[this.selectedPrIndex]?.setSelected(true);
      this.prListContainer.scrollChildIntoView(
        this.prRenderables[this.selectedPrIndex]!.id,
      );
    }
  }

  private openSelectedPr() {
    if (
      this.selectedPrIndex < 0 ||
      this.selectedPrIndex >= this.prRenderables.length
    )
      return;
    open(this.prRenderables[this.selectedPrIndex]!.prUrl);
  }
}

export { AppView };
export type { PrCollections };
