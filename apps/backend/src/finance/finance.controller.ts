import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import {
  CreateCategoryDto,
  InsightsQueryDto,
  ManualTxnDto,
  UpdateCategoryDto,
  UpdateFinanceConfigDto,
} from "./dto";
import { FinanceService } from "./finance.service";

@ApiTags("[11] Finance")
@ApiBearerAuth("bearer")
@Controller("finance")
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get("categories")
  @ApiOperation({ summary: "List spending categories (seeds defaults on first call)" })
  @ApiResponse({ status: 200, description: "Category list", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async listCategories() {
    return ok(await this.service.listCategories(), "Categories");
  }

  @Post("categories")
  @ApiOperation({ summary: "Create a new spending category" })
  @ApiResponse({ status: 201, description: "Created category", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return ok(await this.service.createCategory(dto), "Category created");
  }

  @Patch("categories/:id")
  @ApiOperation({ summary: "Rename / recolour / re-budget a category" })
  @ApiResponse({ status: 200, description: "Updated category", type: SuccessResponseDto })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDto })
  async updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return ok(await this.service.updateCategory(id, dto), "Category updated");
  }

  @Delete("categories/:id")
  @ApiOperation({ summary: "Delete a category" })
  @ApiResponse({ status: 200, description: "Deleted", type: SuccessResponseDto })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDto })
  async deleteCategory(@Param("id") id: string) {
    await this.service.deleteCategory(id);
    return ok({ id }, "Category deleted");
  }

  @Get("config")
  @ApiOperation({ summary: "Get finance preferences (daily budget, manual-entry toggle)" })
  @ApiResponse({ status: 200, description: "Finance config", type: SuccessResponseDto })
  async getConfig(@CurrentUser() user: AuthUser) {
    return ok(await this.service.getConfig(user.id), "Finance config");
  }

  @Patch("config")
  @ApiOperation({ summary: "Update finance preferences" })
  @ApiResponse({ status: 200, description: "Updated config", type: SuccessResponseDto })
  async updateConfig(@CurrentUser() user: AuthUser, @Body() dto: UpdateFinanceConfigDto) {
    return ok(await this.service.updateConfig(user.id, dto), "Finance config updated");
  }

  @Post("transactions")
  @ApiOperation({ summary: "Add a transaction manually (no SMS required)" })
  @ApiResponse({ status: 201, description: "Created transaction", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Validation error", type: ErrorResponseDto })
  async addManual(@Body() dto: ManualTxnDto) {
    return ok(await this.service.addManual(dto), "Transaction added");
  }

  @Get("insights")
  @ApiOperation({
    summary: "Spending insights for a date range (totals, budget, category breakdown %)",
  })
  @ApiResponse({ status: 200, description: "Spending insights", type: SuccessResponseDto })
  async insights(@CurrentUser() user: AuthUser, @Query() query: InsightsQueryDto) {
    return ok(await this.service.insights(user.id, query), "Spending insights");
  }
}
