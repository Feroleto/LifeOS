import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import type { Event } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CreateEventDto } from "./dto/create-event.dto";
import { FindEventsQueryDto } from "./dto/find-events-query.dto";
import { EventsService } from "./events.service";

/** No PATCH on purpose — see the note on EventsService. */
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateEventDto): Promise<Event> {
    return this.events.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindEventsQueryDto,
  ): Promise<Event[]> {
    return this.events.findAll(userId, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Event> {
    return this.events.findOne(userId, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.events.remove(userId, id);
  }
}
