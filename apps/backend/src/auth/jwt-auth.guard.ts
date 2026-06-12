import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing token");

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      (req as any).user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
