import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("Yes Boss API")
    .setDescription(
      `Android background-agent backend — call recording, SMS parsing, location tracking & smart auto-reply.

**Core flows:**
- **Auth** — \`POST /api/v1/auth/login\` → \`POST /api/v1/auth/refresh\` → \`POST /api/v1/auth/device-token\`
- **Call sync** — \`POST /api/v1/calls/sync\` (metadata) or \`POST /api/v1/calls/upload\` (recording)
- **Auto recap** — \`POST /api/v1/calls/auto-recap\` (background worker, device token)
- **SMS** — \`POST /api/v1/sms-txns/sync\` → \`GET /api/v1/sms-txns\`
- **Location** — \`POST /api/v1/location/points\` → \`GET /api/v1/location/distance\`

**Response envelope** — All responses are wrapped:
\`\`\`json
{ "data": ..., "message": "...", "status": "success", "statusCode": 200 }
\`\`\`

**Authorization** — Include \`Authorization: Bearer <accessToken>\` header on all protected routes.`,
    )
    .setVersion("1.0")
    .addServer("/", "Local dev")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the accessToken from POST /api/v1/auth/login",
      },
      "bearer",
    )
    .addTag("[1] Auth", "Login, token refresh, device token")
    .addTag("[2] Calls", "Call-log sync, recording upload, paginated list")
    .addTag("[3] Recap", "AI transcription & SMS-ready summaries")
    .addTag("[4] SMS Transactions", "Parsed SMS batch sync, list, spending summary")
    .addTag("[5] Stats", "Dashboard overview, daily digest, peak-usage buckets")
    .addTag("[6] Settings", "Auto-reply & recap config per user")
    .addTag("[7] Media", "Photo / video backup upload & list")
    .addTag("[8] Location", "GPS point sync, distance travelled")
    .addTag("[9] Health", "Liveness & readiness probes")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: "alpha",
      operationsSorter: "method",
    },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Backend listening on http://localhost:${port}/api/v1`);
  console.log(`Swagger UI at http://localhost:${port}/api/docs`);
}

bootstrap();
