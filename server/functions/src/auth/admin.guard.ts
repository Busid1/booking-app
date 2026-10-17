import { applyDecorators, CanActivate, ExecutionContext, ForbiddenException, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== 'admin') {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    return true;
  }
}

/** Requiere un JWT válido perteneciente a un usuario administrador. */
export const AdminOnly = () => applyDecorators(UseGuards(AuthGuard('jwt'), AdminGuard));

/** Requiere un JWT válido (cualquier rol). */
export const Authenticated = () => applyDecorators(UseGuards(AuthGuard('jwt')));
