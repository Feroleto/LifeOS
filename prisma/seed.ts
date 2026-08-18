import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const INITIAL_AREAS = [
  { name: "Health", color: "#22c55e", icon: "heart" },
  { name: "Studies", color: "#3b82f6", icon: "book" },
  { name: "Finance", color: "#eab308", icon: "wallet" },
  { name: "Productivity", color: "#a855f7", icon: "target" },
  { name: "Personal", color: "#f97316", icon: "user" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "feroletoguilherme@gmail.com" },
    update: {},
    create: {
      name: "Guilherme Feroleto",
      email: "feroletoguilherme@gmail.com",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
  });

  for (const area of INITIAL_AREAS) {
    await prisma.area.upsert({
      where: { userId_name: { userId: user.id, name: area.name } },
      update: {},
      create: { userId: user.id, ...area },
    });
  }

  const areas = await prisma.area.count({ where: { userId: user.id } });

  console.log(`Seed concluded: user ${user.email} with ${areas} areas.`);
  // Use this id in the X-User-Id header while the API has no authentication.
  console.log(`X-User-Id: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
