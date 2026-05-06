import { UserResponse } from "./GitHubResponse";
import { User } from "./User";

const from = (ghUser: UserResponse): User => {
  return {
    login: ghUser.login,
    id: ghUser.id,
  };
};

export const UserFactory = {
  from,
};
