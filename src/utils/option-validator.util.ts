import { Command } from "commander";
import { type User } from "../models/User";

const validateRepositoryFormat = (program: Command, repos: string[]): void => {
  const invalidRepos = repos.filter((r) => !/^[^/]+\/[^/]+$/.test(r.trim()));
  if (invalidRepos.length > 0) {
    program.error(
      `Invalid repo format: ${invalidRepos.join(", ")}. Expected OWNER/REPO`,
    );
  }
};

const validateInterval = (program: Command, intervalAsMillis: number): void => {
  if (isNaN(intervalAsMillis)) {
    program.error("Interval must be a number");
  }
};

const validateTeamName = (
  program: Command,
  team: string,
): { org: string; teamName: string } => {
  const [org, teamName] = team.split("/");
  if (!org || !teamName) {
    program.error(
      `Invalid team format: ${team}. Expected ORG/TEAM, e.g. my-org/my-team`,
    );
  }

  return { org, teamName };
};

const validateTeamMemberAmount = (
  program: Command,
  team: string,
  members: User[],
): void => {
  if (members.length === 0) {
    program.error(`No members found for team ${team}`);
  }
};

export {
  validateRepositoryFormat,
  validateInterval,
  validateTeamName,
  validateTeamMemberAmount,
};
