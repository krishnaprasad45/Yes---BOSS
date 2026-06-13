import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SmsTxnController } from "./sms-txn.controller";
import { SmsTxnService } from "./sms-txn.service";

@Module({
  imports: [AuthModule],
  controllers: [SmsTxnController],
  providers: [SmsTxnService],
})
export class SmsTxnModule {}
