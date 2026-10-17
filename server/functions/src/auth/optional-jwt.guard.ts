import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Igual que el guard JWT, pero permite peticiones sin token (req.user queda undefined). */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err) throw err;
    return user || undefined;
  }
}
