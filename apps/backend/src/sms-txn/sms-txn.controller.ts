import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok, paginated } from "../common/envelope";
import { ListSmsTxnsDto, SummaryQueryDto, SyncSmsTxnsDto } from "./dto";
import { SmsTxnService } from "./sms-txn.service";

@Controller("sms-txns")
@UseGuards(JwtAuthGuard)
export class SmsTxnController {
  constructor(private service: SmsTxnService) {}

  /** Device pushes a batch of parsed SMS; dedupe is by stable dedupeKey. */
  @Post("sync")
  async sync(@Body() dto: SyncSmsTxnsDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  @Get()
  async list(@Query() query: ListSmsTxnsDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }

  @Get("summary")
  async summary(@Query() query: SummaryQueryDto) {
    const summary = await this.service.summary(query);
    return ok(summary, "Spending summary");
  }
}
