import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

import { Prisma } from "../../generated/prisma/client";

/**
 * Translates known Prisma errors into HTTP responses, so services do not have to
 * wrap every call in try/catch.
 *
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.translate(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${exception.code}: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
    });
  }

  private translate(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
  } {
    switch (exception.code) {
      case "P2002": {
        const target = exception.meta?.["target"];
        const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");

        return {
          status: HttpStatus.CONFLICT,
          message: fields
            ? `A record with this value already exists (${fields})`
            : "A record with this value already exists",
        };
      }

      case "P2025":
        return {
          status: HttpStatus.NOT_FOUND,
          message: "Record not found",
        };

      case "P2003":
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid reference: the related record does not exist",
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Unexpected database error",
        };
    }
  }
}
