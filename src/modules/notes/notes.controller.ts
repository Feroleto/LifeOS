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
  Query,
} from "@nestjs/common";

import type { Note } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CreateNoteDto } from "./dto/create-note.dto";
import { FindNotesQueryDto } from "./dto/find-notes-query.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { NotesService } from "./notes.service";

@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateNoteDto): Promise<Note> {
    return this.notes.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindNotesQueryDto,
  ): Promise<Note[]> {
    return this.notes.findAll(userId, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Note> {
    return this.notes.findOne(userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<Note> {
    return this.notes.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.notes.remove(userId, id);
  }
}
