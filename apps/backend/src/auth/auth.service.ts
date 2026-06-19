import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import type { AuthTokens, AuthUser } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";

const REFRESH_TTL_DAYS = 30;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens & { user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  /** Rotation: presented refresh token is consumed and replaced. Reuse of a consumed token fails. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired");
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user.id, stored.user.email);
  }

  /**
   * Long-lived token for the background recap worker, which must call the API
   * while the app is closed (no interactive refresh available). Same secret as
   * the access token, so the normal JwtAuthGuard accepts it — just a longer TTL.
   */
  async issueDeviceToken(userId: string, email: string): Promise<{ deviceToken: string }> {
    const deviceToken = await this.jwt.signAsync(
      { sub: userId, email, device: true },
      {
        expiresIn: (process.env.DEVICE_TOKEN_TTL ??
          "90d") as JwtSignOptions["expiresIn"],
      },
    );
    return { deviceToken };
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email });
    const refreshToken = randomBytes(48).toString("base64url");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
    await this.prisma.refreshToken.create({
      data: { tokenHash: sha256(refreshToken), userId, expiresAt },
    });
    // Opportunistic cleanup of expired tokens.
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    return { accessToken, refreshToken };
  }
}
