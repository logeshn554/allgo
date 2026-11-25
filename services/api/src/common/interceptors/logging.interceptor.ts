import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    const sanitizedBody = this.sanitizeData(req.body);

    return next.handle().pipe(
      tap({
        next: (_res) => {
          const duration = Date.now() - start;
          this.logger.log(
            JSON.stringify({
              method,
              url,
              durationMs: duration,
              status: context.switchToHttp().getResponse().statusCode,
              body: sanitizedBody,
            }),
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.warn(
            JSON.stringify({
              method,
              url,
              durationMs: duration,
              error: err.message,
              body: sanitizedBody,
            }),
          );
        },
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (lower.includes('otp') || lower.includes('code')) {
        sanitized[key] = '[REDACTED_OTP]';
      } else if (lower.includes('phone') && typeof sanitized[key] === 'string') {
        const p = sanitized[key];
        sanitized[key] = p.length > 6 ? `${p.slice(0, 3)}****${p.slice(-4)}` : '****';
      }
    }
    return sanitized;
  }
}
