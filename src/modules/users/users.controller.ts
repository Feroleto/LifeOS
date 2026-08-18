import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from "@nestjs/common";

import type { User } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { Public } from "../../shared/auth/public.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Public: the only way to create the first user of the system. */
  @Public()
  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.users.create(dto);
  }

  @Get("me")
  findMe(@CurrentUser() userId: string): Promise<User> {
    return this.users.findById(userId);
  }

  @Patch("me")
  updateMe(@CurrentUser() userId: string, @Body() dto: UpdateUserDto): Promise<User> {
    return this.users.update(userId, dto);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMe(@CurrentUser() userId: string): Promise<void> {
    return this.users.remove(userId);
  }
}
