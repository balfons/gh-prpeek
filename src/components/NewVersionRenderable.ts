import {
  BoxOptions,
  BoxRenderable,
  KeyEvent,
  RenderContext,
  StyledText,
  TextRenderable,
} from "@opentui/core";

export interface NewVersionRenderableOptions extends BoxOptions {
  bodyRows: StyledText[];
  actionText?: StyledText;
  actionKeyNames?: string[];
}
export class NewVersionRenderable extends BoxRenderable {
  private bodyRows: StyledText[] = [];
  private actionText?: StyledText;
  private actionKeyNames?: string[];
  constructor(ctx: RenderContext, options: NewVersionRenderableOptions) {
    const { bodyRows, actionText, actionKeyNames, ...boxOptions } = options;
    super(ctx, boxOptions);

    this.bodyRows = bodyRows;
    this.actionText = actionText;
    this.actionKeyNames = actionKeyNames;

    this.bodyRows
      .map(
        (row, index) =>
          new TextRenderable(ctx, {
            id: `new-version-row-${index}`,
            content: row,
            alignItems: "center",
            justifyContent: "center",
          })
      )
      .forEach((tr) => this.add(tr));

    if (this.actionText) {
      const actionTextRenderable = new TextRenderable(ctx, {
        id: "new-version-action-text",
        content: this.actionText,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
      });
      this.add(actionTextRenderable);
    }

    if (this.actionKeyNames && this.actionKeyNames.length > 0) {
      const keyHandler = ctx.keyInput;

      keyHandler.on("keypress", (key: KeyEvent) => {
        if (this.actionKeyNames?.includes(key.name || "")) {
          this.destroyRecursively();
        }
      });
    }
  }
}
