import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CallModule } from "../call/call.module";
import { SmsTxnModule } from "../sms-txn/sms-txn.module";
import { StatsModule } from "../stats/stats.module";
import { LocationModule } from "../location/location.module";
import { SettingsModule } from "../settings/settings.module";
import { BulkController } from "./bulk.controller";
import { BulkService } from "./bulk.service";

@Module({
  imports: [AuthModule, CallModule, SmsTxnModule, StatsModule, LocationModule, SettingsModule],
  controllers: [BulkController],
  providers: [BulkService],
})
export class BulkModule {}
