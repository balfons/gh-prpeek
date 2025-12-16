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
  private spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
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

  startSpinner(text: string) {
    this.clearSpinner();
    this.content = t`${dim("[")}${cyan(this.spinnerFrames[0])} ${dim(
      text
    )}${dim("]")}`;
    this.spinnerInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
      this.content = t`${dim("[")}${cyan(
        this.spinnerFrames[this.spinnerIndex]
      )} ${text}${dim("]")}`;
    }, 80).unref();
  }

  stopSpinner(text: string) {
    if (this.isDestroyed) return;
    this.clearSpinner();
    this.content = t`${dim("[")}${green("✓")} ${dim(text)}${dim("]")}`;
  }

  stopSpinnerWithError(text: string) {
    if (this.isDestroyed) return;
    this.clearSpinner();
    this.content = t`${dim("[")}${red("✗")} ${dim(text)}${dim("]")}`;
  }

  destroy(): void {
    this.clearSpinner();
  }
}
