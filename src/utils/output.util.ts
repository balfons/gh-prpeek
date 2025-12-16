import chalk from "chalk";
import { PullRequest } from "../models/PullRequest";
import { CliRenderer } from "@opentui/core";
import { PullRequestRenderable } from "../components/PullRequestRenderable";

export const getUpgradeMessage = (
  currentVersion: string,
  newVersion: string
): string => {
  return `prpeek update available ${chalk.dim(currentVersion)} → ${chalk.green(
    newVersion
  )}\nRun ${chalk.cyan(`gh extension upgrade balfons/gh-prpeek`)} to update`;
};

export const formatRepoNames = (repos: string[]): string[] =>
  repos.map((repo) => repo.split("/").pop()).filter((r) => r !== undefined);

export const getPrNumberIndent = (prs: PullRequest[]): number => {
  return Math.max(...prs.map((pr) => String(pr.number).length));
};

export const formattedDateText = () => {
  const date = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeStyle: "medium",
    hour12: false,
  };

  const formattedDate = new Intl.DateTimeFormat("se-sv", dateOptions).format(
    date
  );
  const formattedTime = new Intl.DateTimeFormat("se-sv", timeOptions).format(
    date
  );

  return `${formattedDate} ${formattedTime}`;
};

export const getPrRenderables = ({
  renderer,
  pullRequests,
  hideChecks,
}: {
  renderer: CliRenderer;
  pullRequests: PullRequest[];
  hideChecks: boolean;
}) => {
  const indent = getPrNumberIndent(pullRequests);

  return pullRequests.map(
    (pr) =>
      new PullRequestRenderable(renderer, {
        hideFailingChecks: hideChecks,
        indent,
        pr,
      })
  );
};
