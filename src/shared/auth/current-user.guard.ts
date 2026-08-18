import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isUUID } from "class-validator";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

export const USER_ID_HEADER = "x-user-id";

export interface RequestWithUser extends Request {
  userId: string;
}

/**
 * Temporary user identification while V1 has no authentication: the id comes in
 * the `X-User-Id` header.
 *
 * When real auth lands, only this guard changes — controllers and services keep
 * consuming `@CurrentUser()`.
 */
@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers[USER_ID_HEADER];
    const userId = Array.isArray(header) ? header[0] : header;

    if (!userId) {
      throw new UnauthorizedException(`Header ${USER_ID_HEADER} is required`);
    }

    if (!isUUID(userId)) {
      throw new UnauthorizedException(`Header ${USER_ID_HEADER} must be a UUID`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    request.userId = user.id;

    return true;
  }
}
