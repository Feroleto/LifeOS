import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";

import type { Area } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { AreasService } from "./areas.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";

@Controller("areas")
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateAreaDto): Promise<Area> {
    return this.areas.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser() userId: string): Promise<Area[]> {
    return this.areas.findAll(userId);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Area> {
    return this.areas.findOne(userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAreaDto,
  ): Promise<Area> {
    return this.areas.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.areas.remove(userId, id);
  }
}
