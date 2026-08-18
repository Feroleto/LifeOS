import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { RequestWithUser } from "./current-user.guard";

/**
 * Returns the user id resolved by CurrentUserGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return request.userId;
  },
);
