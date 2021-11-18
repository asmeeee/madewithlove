import { createCookie } from "remix";

import { User } from "~/types";

export const userCookie = createCookie("user", {
  httpOnly: true,
  maxAge: 604_800,
});

export const getUser = async (request: Request): Promise<User> =>
  (await userCookie.parse(request.headers.get("Cookie"))) || {};

export const setUser = async (user: User) => await userCookie.serialize(user);
