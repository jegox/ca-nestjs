import { SetMetadata } from '@nestjs/common';
import { USER_ROLES } from '@domain/enums';

export const ROLES_KEY = 'roles';

export const Roles = (
  ...roles: USER_ROLES[]
): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
