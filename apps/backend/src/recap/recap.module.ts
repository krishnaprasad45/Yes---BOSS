import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RecapController } from "./recap.controller";
import { RecapService } from "./recap.service";
import { TranscriptionService } from "./transcription.service";
import { SummaryService } from "./summary.service";

@Module({
  imports: [AuthModule],
  controllers: [RecapController],
  providers: [RecapService, TranscriptionService, SummaryService],
})
export class RecapModule {}
