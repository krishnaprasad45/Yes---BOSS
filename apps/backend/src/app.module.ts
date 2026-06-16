import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { SmsTxnModule } from "./sms-txn/sms-txn.module";
import { CallModule } from "./call/call.module";
import { SettingsModule } from "./settings/settings.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    SmsTxnModule,
    CallModule,
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
