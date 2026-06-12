/** Seeds the single admin user from env. Run: yarn workspace @yes-boss/backend prisma:seed */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Boss";
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in apps/backend/.env before seeding");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, name, passwordHash },
  });
  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
