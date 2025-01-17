import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { Role } from "@prisma/client";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {

        const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles)
            return true;

        const { user } = context.switchToHttp().getRequest();

        const hasRoles = requiredRoles.some((role) => user.roles?.includes(role));

        if (!hasRoles)
            throw new UnauthorizedException('You do not have the required rights to perform this action');

        return true;
    }
}