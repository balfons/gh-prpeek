import {
  ASCIIFontRenderable,
  type BoxOptions,
  BoxRenderable,
  type ColorInput,
  KeyEvent,
  type RenderContext,
  StyledText,
  TextRenderable,
} from "@opentui/core";

export interface SplashScreenRenderableOptions extends BoxOptions {
  bodyRows: StyledText[];
  asciiText: string;
  asciiColor?: ColorInput;
}
export class SplashScreenRenderable extends BoxRenderable {
  private bodyRows: StyledText[] = [];
  private logo: ASCIIFontRenderable;
  constructor(ctx: RenderContext, options: SplashScreenRenderableOptions) {
    const { bodyRows, asciiText, asciiColor, ...boxOptions } = options;
    super(ctx, boxOptions);

    this.bodyRows = bodyRows;

    this.logo = new ASCIIFontRenderable(ctx, {
      id: "splash-screen-logo",
      text: asciiText,
      font: "block",
      color: asciiColor,
      marginBottom: 1,
    });
    this.add(this.logo);

    this.bodyRows
      .map(
        (row, index) =>
          new TextRenderable(ctx, {
            id: `splash-screen-row-${index}`,
            content: row,
            alignItems: "center",
            justifyContent: "center",
            maxWidth: this.logo.width + 20,
          }),
      )
      .forEach((tr) => this.add(tr));
  }
}
