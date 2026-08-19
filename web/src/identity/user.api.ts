import { http } from "@/api/http";
import type { User } from "./user.types";

export type CreateUserBody = {
  name: string;
  email: string;
  timezone: string;
  locale: string;
};

export function getMe(): Promise<User> {
  return http.get<User>("/users/me");
}

/** POST /users is the only public write route — it is how the first user exists. */
export function createUser(body: CreateUserBody): Promise<User> {
  return http.post<User>("/users", body, true);
}
