import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok, paginated } from "../common/envelope";
import { ErrorResponseDto, PaginatedResponseDto, SuccessResponseDto } from "../common/response.dto";
import { ListSmsTxnsDto, SummaryQueryDto, SyncSmsTxnsDto } from "./dto";
import { SmsTxnService } from "./sms-txn.service";

@ApiTags("[4] SMS Transactions")
@ApiBearerAuth("bearer")
@Controller("sms-txns")
@UseGuards(JwtAuthGuard)
export class SmsTxnController {
  constructor(private service: SmsTxnService) {}

  @Post("sync")
  @ApiOperation({ summary: "Push a batch of device-parsed SMS transactions (deduped by dedupeKey)" })
  @ApiBody({
    type: SyncSmsTxnsDto,
    examples: {
      default: {
        value: {
          items: [
            {
              type: "debit",
              amountMinor: 49900,
              merchant: "Swiggy",
              source: "HDFC Bank",
              rawBody: "INR 499.00 debited from HDFC Bank a/c for Swiggy order.",
              sender: "HDFCBK",
              receivedAt: "2025-06-20T12:00:00.000Z",
              dueAt: null,
              dedupeKey: "abc123hash",
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Returns inserted/skipped counts", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async sync(@Body() dto: SyncSmsTxnsDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  @Get()
  @ApiOperation({ summary: "List parsed SMS transactions (paginated, filterable by type/date/search)" })
  @ApiResponse({ status: 200, description: "Paginated SMS transaction list", type: PaginatedResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async list(@Query() query: ListSmsTxnsDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }

  @Get("summary")
  @ApiOperation({ summary: "Spending summary (total debit/credit/payment_due amounts in the date window)" })
  @ApiResponse({ status: 200, description: "Aggregated spending totals", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async summary(@Query() query: SummaryQueryDto) {
    const summary = await this.service.summary(query);
    return ok(summary, "Spending summary");
  }
}
