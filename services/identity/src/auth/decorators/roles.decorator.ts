import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '@vote-capsule/types';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
