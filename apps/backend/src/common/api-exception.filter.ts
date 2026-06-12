import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import type { ApiErrorBody } from "@yes-boss/shared";

/** Shapes every error into the standard envelope: { data: null, message, status, statusCode }. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === "string"
          ? body
          : Array.isArray((body as any).message)
            ? (body as any).message.join(", ")
            : ((body as any).message ?? exception.message);
    } else if (exception instanceof Error) {
      console.error(exception);
    }

    const payload: ApiErrorBody = { data: null, message, status: "error", statusCode };
    res.status(statusCode).json(payload);
  }
}
