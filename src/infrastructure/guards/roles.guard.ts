import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLES } from '@domain/enums';
import { ROLES_KEY } from '@infrastructure/decorators/roles.decorator';

interface IRequestWithUser {
  user?: {
    role: USER_ROLES;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<USER_ROLES[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const userRole = request.user?.role;

    if (!userRole) {
      return false;
    }

    return requiredRoles.includes(userRole);
  }
}
