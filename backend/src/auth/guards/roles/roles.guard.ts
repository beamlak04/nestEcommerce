import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY  } from '../../../auth/decorators/roles/roles.decorator.js';


@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean{
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(),context.getClass()]);
    if(!roles) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
// User role: {
//   sub: '13d0bfa5-da55-4251-aaf0-0a18cc859b7a',
//   sid: '23954f6d-63e2-45c7-ac29-cc498e79a3f9',
//   type: 'refresh',
//   iat: 1771795536,
//   exp: 1771796140
// }

    if(!roles.includes(user.role)){
      throw new ForbiddenException('Forbidden resource');
    }
    return true;
  }
}
