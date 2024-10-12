import { Server } from "node:net";
import { Ora } from "ora";
import { disableAlternateBuffer } from "./utils/terminal.util";

const handleOnUncaughtExceptionEvent =
  (server: Server, spinner: Ora): Bun.UncaughtExceptionListener =>
  async (error) => {
    spinner.stop();
    server.close();
    disableAlternateBuffer();
    console.error(error);
    process.exit(1);
  };

const handleOnUnhandledRejectionEvent =
  (server: Server, spinner: Ora): Bun.UnhandledRejectionListener =>
  async (error) => {
    spinner.stop();
    server.close();
    disableAlternateBuffer();
    console.error(error);
    process.exit(1);
  };

const handleOnSignalEvent =
  (server: Server, spinner: Ora): Bun.SignalsListener =>
  async () => {
    spinner.stop();
    server.close();
    disableAlternateBuffer();
    process.exit(1);
  };

export const registerProcessEvents = (server: Server, spinner: Ora) => {
  process.on(
    "uncaughtException",
    handleOnUncaughtExceptionEvent(server, spinner)
  );
  process.on(
    "unhandledRejection",
    handleOnUnhandledRejectionEvent(server, spinner)
  );
  process.on("SIGINT", handleOnSignalEvent(server, spinner));
  process.on("SIGTERM", handleOnSignalEvent(server, spinner));
};
