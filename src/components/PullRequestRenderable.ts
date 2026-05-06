import {
  bg,
  BoxOptions,
  BoxRenderable,
  dim,
  fg,
  hexToRgb,
  RenderContext,
  StyledText,
  t,
  TextRenderable,
  underline,
} from "@opentui/core";
import {
  blue,
  colorIsDarkSimple,
  cyan,
  green,
  magenta,
  red,
  yellow,
} from "../utils/color.util";
import open from "open";
import { CheckStatus, PullRequest } from "../models/PullRequest";

export interface PullRequestRenderableOptions extends BoxOptions {
  indent: number;
  pr: PullRequest;
  hideFailingChecks?: boolean;
  showLabels?: boolean;
}
export class PullRequestRenderable extends BoxRenderable {
  private readonly titleRenderable: TextRenderable;
  private readonly pr: PullRequest;

  constructor(ctx: RenderContext, options: PullRequestRenderableOptions) {
    const {
      indent,
      pr,
      hideFailingChecks = false,
      showLabels = false,
      ...boxOptions
    } = options;

    super(ctx, {
      id: `pr-container-${pr.number}`,
      ...boxOptions,
    });

    this.pr = pr;

    const indent1 = indent + 2;
    const indent2 = indent;

    const row1 = new BoxRenderable(ctx, {
      id: "row-1",
      flexDirection: "row",
      gap: 1,
      height: 1,
      width: "100%",
    });

    const row2 = new BoxRenderable(ctx, {
      id: "row-2",
      marginLeft: indent1,
      flexDirection: "row",
      gap: 1,
      height: 1,
      width: "100%",
    });

    const row3 = new BoxRenderable(ctx, {
      id: "row-3",
      flexDirection: "row",
      marginLeft: indent2,
      gap: 1,
      height: 1,
      width: "100%",
    });

    const failedChecksContainer = new BoxRenderable(ctx, {
      id: "failed-checks-container",
      flexDirection: "column",
      marginLeft: indent1,
      width: "100%",
    });

    // PR Number
    const prNumberRenderable = new TextRenderable(ctx, {
      content: t`${pr.isDraft ? dim(`#${pr.number}`) : green(`#${pr.number}`)}`,
    });

    // PR Title
    const titleIndent = indent - pr.number.toString().length;
    this.titleRenderable = new TextRenderable(ctx, {
      content: pr.title,
      width: pr.title.length,
      marginLeft: titleIndent > 0 ? titleIndent : 0,
    });
    this.titleRenderable.onMouseUp = () => {
      open(pr.url);
    };
    this.titleRenderable.onMouseOver = () => {
      if (this.isDestroyed) return;
      this.titleRenderable.content = t`${underline(pr.title)}`;
      this.ctx.setMousePointer("pointer");
    };
    this.titleRenderable.onMouseOut = () => {
      if (this.isDestroyed) return;
      this.titleRenderable.content = pr.title;
      this.ctx.setMousePointer("default");
    };

    // Author
    const authorRenderable = new TextRenderable(ctx, {
      content: t`${blue(pr.author)}`,
    });

    // Repository
    const repoRenderable = new TextRenderable(ctx, {
      content: t`${cyan(`[${pr.repository}]`)}`,
    });

    // Additions and Deletions
    const additionsAndDeletionsRenderable = new TextRenderable(ctx, {
      content: t`[${green(`+${pr.additions}`)} ${red(`-${pr.deletions}`)}]`,
    });

    const labelRenderables = showLabels
      ? pr.labels.map((label) => {
          const rgb = hexToRgb(`#${label.color}`);

          const fgColor = colorIsDarkSimple(`#${label.color}`)
            ? "#ffffff"
            : "#000000";
          return new TextRenderable(ctx, {
            content: t`${fg(fgColor)(bg(rgb)(` ${label.name} `))}`,
          });
        })
      : [];
    // Status Check
    const statusCheckRenderable = new TextRenderable(ctx, {
      content: this.getStatusCheckText(pr),
    });

    // Comments
    const commentsRenderable = new TextRenderable(ctx, {
      content: this.getCommentsText(pr),
    });

    // Review Decision
    const reviewDecisionRenderable = new TextRenderable(ctx, {
      content: this.getReviewDecisionText(pr),
    });

    // Mergeable State
    const mergeableStateRenderable = new TextRenderable(ctx, {
      content: this.getMergeableStateText(pr),
    });

    // Failed Checks
    const failedChecks: TextRenderable[] = pr.failingChecks.map((check) => {
      const failedCheck = new TextRenderable(ctx, {
        content: t`${red(check.name)}`,
        width: check.name.length,
      });

      failedCheck.onMouseUp = () => {
        open(check.url);
      };
      failedCheck.onMouseOver = () => {
        if (this.isDestroyed) return;
        this.ctx.setMousePointer("pointer");
        failedCheck.content = t`${underline(red(check.name))}`;
      };
      failedCheck.onMouseOut = () => {
        if (this.isDestroyed) return;
        this.ctx.setMousePointer("default");
        failedCheck.content = t`${red(check.name)}`;
      };

      return failedCheck;
    });

    row1.add(prNumberRenderable);
    row1.add(this.titleRenderable);

    row2.add(authorRenderable);
    row2.add(repoRenderable);
    row2.add(additionsAndDeletionsRenderable);

    labelRenderables.forEach((labelRenderable) => {
      row2.add(labelRenderable);
    });

    row3.add(statusCheckRenderable);
    row3.add(commentsRenderable);
    row3.add(reviewDecisionRenderable);
    row3.add(mergeableStateRenderable);

    this.add(row1);
    this.add(row2);
    this.add(row3);

    if (!hideFailingChecks && failedChecks.length > 0) {
      failedChecks.forEach((check) => failedChecksContainer.add(check));
      this.add(failedChecksContainer);
    }
  }

  setSelected(selected: boolean): void {
    if (this.isDestroyed) return;
    this.titleRenderable.content = selected
      ? t`${underline(this.pr.title)}`
      : this.pr.title;
  }

  get prUrl(): string {
    return this.pr.url;
  }

  private getStatusCheckText(pr: PullRequest): StyledText {
    let statusCheck: StyledText = t``;

    switch (pr.checkStatus) {
      case CheckStatus.SUCCESSFUL:
        statusCheck = t`${green("✓")} ${green(`${pr.successfulChecks.length}/${pr.totalChecksCount} Checks passing`)}`;
        break;
      case CheckStatus.PENDING:
        statusCheck = t`${yellow("◌")} ${yellow(`${pr.pendingChecks.length}/${pr.totalChecksCount} Checks pending`)}`;
        break;
      case CheckStatus.FAILURE:
        statusCheck = t`${red("×")} ${red(
          `${pr.failingChecks.length}/${pr.totalChecksCount} checks failing`,
        )}`;
        break;
      case CheckStatus.NONE:
        statusCheck = t``;
    }

    return statusCheck;
  }

  private getCommentsText(pr: PullRequest): string {
    const count = pr.reviewComments.length;
    const text = count === 1 ? "Comment" : "Comments";

    return `✎ ${count} ${text}`;
  }

  private getReviewDecisionText(pr: PullRequest): StyledText {
    let reviewDecision: StyledText = t``;

    if (pr.reviewDecision === "REVIEW_REQUIRED") {
      reviewDecision = t`${yellow("• Review required")}`;
    } else if (pr.reviewDecision === "CHANGES_REQUESTED") {
      const text =
        pr.requestedChangeCount === 1
          ? "Requested change"
          : "Requested changes";

      reviewDecision = t`${red(`⚑ ${pr.requestedChangeCount} ${text}`)}`;
    } else if (pr.reviewDecision === "APPROVED") {
      reviewDecision = t`${green(`✓ ${pr.approvedCount} Approved ${pr.approvedByMe ? "(You)" : ""}`)}`;
    } else if (pr.isReviewRequested) {
      reviewDecision = t`${magenta("⊙ Review requested")}`;
    }

    return reviewDecision;
  }

  private getMergeableStateText(pr: PullRequest): StyledText {
    let mergeableState: StyledText = t``;
    if (pr.isMergable) {
      mergeableState = t`${green("↢ Mergeable")}`;
    } else if (pr.hasConflicts) {
      mergeableState = t`${red("⊘ Conflicts")}`;
    }

    return mergeableState;
  }
}
