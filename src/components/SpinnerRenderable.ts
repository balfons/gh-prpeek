import {
  dim,
  RenderContext,
  StyledText,
  t,
  TextOptions,
  TextRenderable,
} from "@opentui/core";
import { cyan, green, red } from "../utils/color.util";

export interface SpinnerRenderableOptions extends TextOptions {
  text: StyledText;
}
export class SpinnerRenderable extends TextRenderable {
  private spinnerIndex: number = 0;
  private spinnerFrames = ["◜", "◠", "◝", "◞", "◡", "◟"];
  private spinnerInterval: Timer | null = null;
  constructor(ctx: RenderContext, options: SpinnerRenderableOptions) {
    const { text, ...textOptions } = options;

    super(ctx, {
      ...textOptions,
    });
  }

  private clearSpinner() {
    this.spinnerIndex = 0;
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  getStyledContent(
    state: "loading" | "success" | "error",
    text: string,
  ): StyledText {
    const icon =
      state === "loading"
        ? cyan(this.spinnerFrames[this.spinnerIndex])
        : state === "success"
          ? green("✓")
          : red("✗");
    return t`${dim("[")}${icon} ${dim(text.replaceAll(" ", " "))}${dim("]")}`;
  }

  startSpinner(text: string) {
    this.clearSpinner();
    this.content = this.getStyledContent("loading", text);
    this.spinnerInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
      this.content = this.getStyledContent("loading", text);
    }, 100).unref();
  }

  stopSpinner(text: string) {
    if (this.isDestroyed) return;
    this.clearSpinner();
    this.content = this.getStyledContent("success", text);
  }

  stopSpinnerWithError(text: string) {
    if (this.isDestroyed) return;
    this.clearSpinner();
    this.content = this.getStyledContent("error", text);
  }

  destroy(): void {
    this.clearSpinner();
  }
}
