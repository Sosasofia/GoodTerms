import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up old demo data...");

  const groupCodes = ["BALI-2025", "DEMO_SEED_MARKER_2025"];
  for (const code of groupCodes) {
    const group = await prisma.group.findUnique({ where: { code } });
    if (group) {
      await prisma.group.delete({ where: { id: group.id } });
    }
  }

  const demoEmails = [
    "alice@demo.com",
    "bob@demo.com",
    "carol@demo.com",
    "david@demo.com",
    "emma@demo.com",
    "frank@demo.com",
  ];

  for (const email of demoEmails) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  console.log("🌱 Seeding demo users...");

  const demoUsers = [
    { name: "Alice Chen", email: "alice@demo.com", guestId: uuidv4() },
    { name: "Bob Martinez", email: "bob@demo.com", guestId: uuidv4() },
    { name: "Carol Singh", email: "carol@demo.com", guestId: uuidv4() },
    { name: "David Lee", email: "david@demo.com", guestId: uuidv4() },
    { name: "Emma Wilson", email: "emma@demo.com", guestId: uuidv4() },
    { name: "Frank Johnson", email: "frank@demo.com", guestId: uuidv4() },
  ];

  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          guestId: user.guestId,
        },
      }),
    ),
  );

  console.log("🌴 Seeding BALI-2025 group...");

  const baliGroup = await prisma.group.create({
    data: {
      name: "Bali Trip 2025",
      code: "BALI-2025",
      pin: null,
      members: {
        connect: [
          { id: users[0].id },
          { id: users[1].id },
          { id: users[2].id },
          { id: users[3].id },
        ],
      },
    },
    include: { members: true },
  });

  console.log("💸 Seeding expenses & splits...");

  const baliExpenses = [
    {
      description: "Villa rental (4 nights)",
      amount: 800,
      payerId: users[0].id,
      splits: [
        { debtorId: users[0].id, amount: 200 },
        { debtorId: users[1].id, amount: 200 },
        { debtorId: users[2].id, amount: 200 },
        { debtorId: users[3].id, amount: 200 },
      ],
    },
    {
      description: "Dinner at Seminyak Beach Club",
      amount: 240,
      payerId: users[1].id,
      splits: [
        { debtorId: users[0].id, amount: 60 },
        { debtorId: users[1].id, amount: 60 },
        { debtorId: users[2].id, amount: 60 },
        { debtorId: users[3].id, amount: 60 },
      ],
    },
    {
      description: "Scooter rentals",
      amount: 120,
      payerId: users[2].id,
      splits: [
        { debtorId: users[0].id, amount: 30 },
        { debtorId: users[1].id, amount: 30 },
        { debtorId: users[2].id, amount: 30 },
        { debtorId: users[3].id, amount: 30 },
      ],
    },
    {
      description: "Yoga class & spa day",
      amount: 300,
      payerId: users[0].id,
      splits: [
        { debtorId: users[0].id, amount: 75 },
        { debtorId: users[2].id, amount: 75 },
        { debtorId: users[3].id, amount: 75 },
        { debtorId: users[1].id, amount: 75 },
      ],
    },
    {
      description: "Boat tour to Gili Islands",
      amount: 200,
      payerId: users[3].id,
      splits: [
        { debtorId: users[0].id, amount: 50 },
        { debtorId: users[1].id, amount: 50 },
        { debtorId: users[2].id, amount: 50 },
        { debtorId: users[3].id, amount: 50 },
      ],
    },
  ];

  const baliTransactions = await Promise.all(
    baliExpenses.map((expense) =>
      prisma.transaction.create({
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
      senderId: users[1].id,
      receiverId: users[0].id,
      splitId: baliTransactions[0].splits[1].id,
    },
    {
      amount: 240,
      senderId: users[0].id,
      receiverId: users[1].id,
      splitId: baliTransactions[1].splits[0].id,
    },
  ];

  await Promise.all(
    baliSettlements.map((settlement) =>
      prisma.transaction.create({
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
