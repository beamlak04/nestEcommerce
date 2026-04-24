import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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

    if(!roles.includes(user.role)){
      throw new ForbiddenException('You do not have permission to access this resource.');
    }
    return true;
  }
}
