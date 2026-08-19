import { z } from "zod";

import type { CreateUserBody } from "./user.api";

/** CurrentUserGuard validates with `isUUID` and no version, so neither do we. */
export const existingUserSchema = z.object({
  userId: z.uuid("Paste the UUID printed by `npm run db:seed`"),
});

export type ExistingUserValues = z.infer<typeof existingUserSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: z.email("Not a valid email").max(255),
  timezone: z.string().trim().min(1, "Required"),
  locale: z.string().trim().min(1, "Required"),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export function toCreateUserBody(values: CreateUserValues): CreateUserBody {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    timezone: values.timezone.trim(),
    locale: values.locale.trim(),
  };
}

/** Sensible starting points; both fields stay editable because the API validates them. */
export function detectUserDefaults(): { timezone: string; locale: string } {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  };
}
