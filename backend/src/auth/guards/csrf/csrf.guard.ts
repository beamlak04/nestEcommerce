import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CSRF_PROTECTED_KEY } from '../../decorators/csrf/csrf.decorator.js';
import { CsrfService } from '../../csrf/csrf.service.js';

@Injectable()
export class CsrfGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
        private readonly csrfService: CsrfService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isProtected = this.reflector.getAllAndOverride<boolean>(CSRF_PROTECTED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!isProtected) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const refreshToken = request.cookies?.['refreshToken'];

        if (!refreshToken) {
            throw new UnauthorizedException('Missing refresh token.');
        }

        const csrfCookie = request.cookies?.['csrfToken'];
        const csrfHeader = this.getHeaderValue(request.headers['x-csrf-token']);

        if (!csrfCookie || !csrfHeader) {
            throw new ForbiddenException('Missing CSRF token.');
        }

        const expectedOrigin = this.configService.getOrThrow<string>('app.clientUrl');
        const requestOrigin = this.getRequestOrigin(request);

        if (!requestOrigin) {
            throw new ForbiddenException('Missing Origin or Referer header.');
        }

        if (requestOrigin !== expectedOrigin) {
            throw new ForbiddenException('Invalid request origin.');
        }

        if (!this.csrfService.validate(csrfCookie, csrfHeader, refreshToken)) {
            throw new ForbiddenException('CSRF validation failed.');
        }

        return true;
    }

    private getHeaderValue(value: string | string[] | undefined): string {
        if (Array.isArray(value)) {
            return value[0] || '';
        }

        return value || '';
    }

    private getRequestOrigin(request: Request): string | null {
        const originHeader = this.getHeaderValue(request.headers.origin);
        if (originHeader) {
            return originHeader;
        }

        const refererHeader = this.getHeaderValue(request.headers.referer);
        if (!refererHeader) {
            return null;
        }

        try {
            return new URL(refererHeader).origin;
        } catch {
            return null;
        }
    }
}