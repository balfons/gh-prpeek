import {
  BoxOptions,
  BoxRenderable,
  dim,
  KeyEvent,
  RenderContext,
  t,
  TextRenderable,
} from "@opentui/core";
import { getHexColor, yellow } from "../utils/color.util";

type Command = {
  key: string;
  description: string;
  keyName?: string;
  action?: () => void;
};
export interface CommandsRenderableOptions extends BoxOptions {
  commands: Command[];
}
export class CommandsRenderable extends BoxRenderable {
  private readonly _keyHandler: RenderContext["keyInput"];
  private readonly _keypressListener: (key: KeyEvent) => void;

  constructor(ctx: RenderContext, options: CommandsRenderableOptions) {
    const { commands, ...boxOptions } = options;

    super(ctx, {
      id: "commands-renderable",
      ...boxOptions,
    });

    options.commands
      .filter((command) => command.key !== "")
      .map((command) => {
        return new TextRenderable(ctx, {
          content: t`${dim("[")}${yellow(command.key)}${dim(
            `: ${command.description}]`,
          )}`,
          bg: getHexColor("defaultBackground"),
        });
      })
      .forEach((commandsText) => {
        this.add(commandsText);
      });

    this._keyHandler = ctx.keyInput;
    this._keypressListener = (key) => {
      options.commands.forEach((command) => {
        if (key.name === command.keyName) {
          command.action?.();
        }
      });
    };
    this._keyHandler.on("keypress", this._keypressListener);
  }

  protected destroySelf(): void {
    this._keyHandler.off("keypress", this._keypressListener);
    super.destroySelf();
  }
}
