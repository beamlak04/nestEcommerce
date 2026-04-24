import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionsService } from '../../../auth/sessions/sessions.service.js';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService, private reflector: Reflector) {}
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'public',
      context.getHandler(),
    )
    if(isPublic) return true;
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (!header) throw new UnauthorizedException('Authorization token is required.');

    const token = header.split(' ')[1];
    if (!token) throw new UnauthorizedException('Invalid authorization token.');

    let payload: any;
    try {
      payload = await this.sessionsService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const active = await this.sessionsService.getSession(payload.sid);
    if(!active) throw new UnauthorizedException('Session is no longer active.');

    await this.sessionsService.updateSessionActivity(payload.sid);

    req.user = payload;
    return true;
  }
}
