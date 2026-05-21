import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { seedUsers, USERS } from "./seeds/users";
import { seedTags } from "./seeds/tags";
import { seedVaults, VAULT_DATA } from "./seeds/vaults";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const users = await seedUsers(db);

  for (const { userId, email } of users) {
    const tags = await seedTags(db, userId);
    const vaults = VAULT_DATA[email] ?? [];
    await seedVaults(db, userId, tags, vaults);
  }

  console.log("Seed complete\n");
  for (const { email, password } of USERS) {
    const vaults = VAULT_DATA[email] ?? [];
    const entryCount = vaults.reduce((n, v) => n + v.entries.length, 0);
    console.log(`  ${email}  (login: ${password})`);
    for (const v of vaults) {
      console.log(
        `    ${v.name.padEnd(14)} ${v.entries.length} entries  vault password: ${v.password}`,
      );
    }
    console.log(`    ${entryCount} entries total\n`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
