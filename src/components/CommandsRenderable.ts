import {
  BoxOptions,
  BoxRenderable,
  CliRenderer,
  dim,
  RenderableOptions,
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
  constructor(ctx: RenderContext, options: CommandsRenderableOptions) {
    const { commands, ...boxOptions } = options;

    super(ctx, {
      id: "commands-renderable",
      ...boxOptions,
    });

    options.commands
      .map((command) => {
        return new TextRenderable(ctx, {
          content: t`${dim("[")}${yellow(command.key)}${dim(
            `: ${command.description}]`
          )}`,
          bg: getHexColor("defaultBackground"),
        });
      })
      .forEach((commandsText) => {
        this.add(commandsText);
      });

    const keyHandler = ctx.keyInput;
    keyHandler.on("keypress", (key) => {
      options.commands.forEach((command) => {
        if (key.name === command.keyName) {
          command.action?.();
        }
      });
    });
  }
}
