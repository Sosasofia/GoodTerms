import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { v4 as uuidv4 } from "uuid";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🧹 Cleaning up old demo data...");

  const groupCodes = ["DEMO-BALI-2025"];
  for (const code of groupCodes) {
    const group = await prisma.group.findUnique({ where: { code } });
    if (group) {
      await prisma.split.deleteMany({
        where: { expense: { groupId: group.id } },
      });
      await prisma.expense.deleteMany({ where: { groupId: group.id } });
      await prisma.member.deleteMany({ where: { groupId: group.id } });
      await prisma.group.delete({ where: { id: group.id } });
    }
  }

  const demoEmails = [
    "duser@demo.com",
    "bob@demo.com",
    "carol@demo.com",
    "david@demo.com",
  ];

  for (const email of demoEmails) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (user) {
      await prisma.member.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  console.log("🌱 Seeding demo users...");

  const demoUsers = [
    { name: "Demo User", email: "duser@demo.com", guestId: uuidv4() },
    { name: "Bob Martinez", email: "bob@demo.com", guestId: uuidv4() },
    { name: "Carol Singh", email: "carol@demo.com", guestId: uuidv4() },
    { name: "David Lee", email: "david@demo.com", guestId: uuidv4() },
  ];

  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
        },
      }),
    ),
  );

  console.log("🌴 Seeding BALI-2025 group...");

  const baliGroup = await prisma.group.create({
    data: {
      name: "Bali Trip 2025",
      code: "DEMO-BALI-2025",
      pin: null,
      ownerId: users[0].id,
      members: {
        create: [
          { name: users[0].name, userId: null },
          { name: users[1].name, userId: null },
          { name: users[2].name, userId: null },
          { name: users[3].name, userId: null },
        ],
      },
    },
    include: { members: true },
  });

  const members = baliGroup.members;

  console.log("💸 Seeding expenses & splits...");

  const baliExpenses = [
    {
      description: "Villa rental (4 nights)",
      amount: 800,
      payerId: members[0].id,
      splits: [
        { debtorId: members[0].id, amount: 200 },
        { debtorId: members[1].id, amount: 200 },
        { debtorId: members[2].id, amount: 200 },
        { debtorId: members[3].id, amount: 200 },
      ],
    },
    {
      description: "Dinner at Seminyak Beach Club",
      amount: 240,
      payerId: members[1].id,
      splits: [
        { debtorId: members[0].id, amount: 60 },
        { debtorId: members[1].id, amount: 60 },
        { debtorId: members[2].id, amount: 60 },
        { debtorId: members[3].id, amount: 60 },
      ],
    },
    {
      description: "Scooter rentals",
      amount: 120,
      payerId: members[2].id,
      splits: [
        { debtorId: members[0].id, amount: 30 },
        { debtorId: members[1].id, amount: 30 },
        { debtorId: members[2].id, amount: 30 },
        { debtorId: members[3].id, amount: 30 },
      ],
    },
    {
      description: "Yoga class & spa day",
      amount: 300,
      payerId: members[0].id,
      splits: [
        { debtorId: members[0].id, amount: 75 },
        { debtorId: members[2].id, amount: 75 },
        { debtorId: members[3].id, amount: 75 },
        { debtorId: members[1].id, amount: 75 },
      ],
    },
    {
      description: "Boat tour to Gili Islands",
      amount: 200,
      payerId: members[3].id,
      splits: [
        { debtorId: members[0].id, amount: 50 },
        { debtorId: members[1].id, amount: 50 },
        { debtorId: members[2].id, amount: 50 },
        { debtorId: members[3].id, amount: 50 },
      ],
    },
  ];

  const baliCreatedExpenses = await Promise.all(
    baliExpenses.map((expense) =>
      prisma.expense.create({
        data: {
          description: expense.description,
          amount: expense.amount,
          type: "expense",
          date: new Date(2025, 0, 15),
          groupId: baliGroup.id,
          payerId: expense.payerId,
          splits: {
            create: expense.splits,
          },
        },
        include: {
          splits: { include: { debtor: true } },
          payer: true,
        },
      }),
    ),
  );

  console.log("🤝 Seeding settlements...");

  const baliSettlements = [
    {
      amount: 200,
      senderId: members[1].id,
      receiverId: members[0].id,
      splitId: baliCreatedExpenses[0].splits[1].id,
    },
    {
      amount: 60,
      senderId: members[0].id,
      receiverId: members[1].id,
      splitId: baliCreatedExpenses[1].splits[0].id,
    },
  ];

  await Promise.all(
    baliSettlements.map((settlement) =>
      prisma.expense.create({
        data: {
          description: "Payment",
          amount: settlement.amount,
          type: "settlement",
          date: new Date(2025, 0, 20),
          groupId: baliGroup.id,
          senderId: settlement.senderId,
          receiverId: settlement.receiverId,
        },
      }),
    ),
  );

  await Promise.all(
    baliSettlements.map((settlement) =>
      prisma.split.update({
        where: { id: settlement.splitId },
        data: { isPaid: true },
      }),
    ),
  );

  console.log("✅ Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
