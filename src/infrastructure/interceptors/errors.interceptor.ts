import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorsInterceptor.name);

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpException) {
          this.logger.warn(`[HTTP ${err.getStatus()}] ${err.message}`);
          return throwError(() => err);
        }

        const message =
          err instanceof Error ? err.message : 'Internal server error';
        const stack = err instanceof Error ? err.stack : undefined;
        this.logger.error(`[Unhandled] ${message}`, stack);

        return throwError(
          () =>
            new HttpException(
              'Internal server error',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }
}
