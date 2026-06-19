import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CallController } from "./call.controller";
import { CallService } from "./call.service";

@Module({
  imports: [AuthModule],
  controllers: [CallController],
  providers: [CallService],
  exports: [CallService],
})
export class CallModule {}
