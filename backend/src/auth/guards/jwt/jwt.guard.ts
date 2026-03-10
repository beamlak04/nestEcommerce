import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import jwt from 'jsonwebtoken';
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
    if (!header) throw new UnauthorizedException('Missing authorization header');

    const token = header.split(' ')[1];
    if (!token) throw new UnauthorizedException('Invalid token no here');

    let payload: any;
    try {
      payload = await this.sessionsService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token here', error.message);
    }

    const active = await this.sessionsService.getSession(payload.sid);
    if(!active) throw new UnauthorizedException('Session revoked');

    await this.sessionsService.updateSessionActivity(payload.sid);
    //console.log(payload);

    req.user = payload;
    return true;
  }
}
