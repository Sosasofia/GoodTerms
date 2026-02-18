import { prisma } from "./prisma";
import { v4 as uuidv4 } from "uuid";

const DEMO_MARKER = "DEMO_SEED_MARKER_2025";

export async function demoSeedExists() {
  const marker = await prisma.group.findUnique({
    where: { code: DEMO_MARKER },
  });
  return !!marker;
}

export async function seedDemoData() {
  const exists = await demoSeedExists();
  if (exists) {
    return await getDemoData();
  }

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

  const bailiGroup = await prisma.group.create({
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

  const bailiExpenses = [
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

  const bailiTransactions = await Promise.all(
    bailiExpenses.map((expense) =>
      prisma.transaction.create({
        data: {
          description: expense.description,
          amount: expense.amount,
          type: "expense",
          date: new Date(2025, 0, 15),
          groupId: bailiGroup.id,
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

  const bailiSettlements = [
    {
      amount: 200,
      senderId: users[1].id,
      receiverId: users[0].id,
      splitId: bailiTransactions[0].splits[1].id,
    },
    {
      amount: 240,
      senderId: users[0].id,
      receiverId: users[1].id,
      splitId: bailiTransactions[1].splits[0].id,
    },
  ];

  await Promise.all(
    bailiSettlements.map((settlement) =>
      prisma.transaction.create({
        data: {
          description: "Payment",
          amount: settlement.amount,
          type: "settlement",
          date: new Date(2025, 0, 20),
          groupId: bailiGroup.id,
          senderId: settlement.senderId,
          receiverId: settlement.receiverId,
        },
      }),
    ),
  );

  await Promise.all(
    bailiSettlements.map((settlement) =>
      prisma.split.update({
        where: { id: settlement.splitId },
        data: { isPaid: true },
      }),
    ),
  );

  const apartmentGroup = await prisma.group.create({
    data: {
      name: "Apartment Q1 Rent",
      code: "APART-Q1",
      pin: "1234",
      members: {
        connect: [
          { id: users[0].id },
          { id: users[1].id },
          { id: users[4].id },
        ],
      },
    },
    include: { members: true },
  });

  const apartmentExpenses = [
    {
      description: "January Rent",
      amount: 3000,
      payerId: users[0].id,
      splits: [
        { debtorId: users[0].id, amount: 1000 },
        { debtorId: users[1].id, amount: 1000 },
        { debtorId: users[4].id, amount: 1000 },
      ],
    },
    {
      description: "Internet & Utilities",
      amount: 180,
      payerId: users[1].id,
      splits: [
        { debtorId: users[0].id, amount: 60 },
        { debtorId: users[1].id, amount: 60 },
        { debtorId: users[4].id, amount: 60 },
      ],
    },
    {
      description: "Groceries",
      amount: 150,
      payerId: users[4].id,
      splits: [
        { debtorId: users[0].id, amount: 50 },
        { debtorId: users[1].id, amount: 50 },
        { debtorId: users[4].id, amount: 50 },
      ],
    },
    {
      description: "February Rent",
      amount: 3000,
      payerId: users[1].id,
      splits: [
        { debtorId: users[0].id, amount: 1000 },
        { debtorId: users[1].id, amount: 1000 },
        { debtorId: users[4].id, amount: 1000 },
      ],
    },
  ];

  const apartmentTransactions = await Promise.all(
    apartmentExpenses.map((expense) =>
      prisma.transaction.create({
        data: {
          description: expense.description,
          amount: expense.amount,
          type: "expense",
          date: new Date(2025, apartmentExpenses.indexOf(expense), 1),
          groupId: apartmentGroup.id,
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

  await Promise.all([
    prisma.transaction.create({
      data: {
        description: "Payment",
        amount: 1000,
        type: "settlement",
        date: new Date(2025, 0, 25),
        groupId: apartmentGroup.id,
        senderId: users[0].id,
        receiverId: users[1].id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: "Payment",
        amount: 60,
        type: "settlement",
        date: new Date(2025, 0, 26),
        groupId: apartmentGroup.id,
        senderId: users[4].id,
        receiverId: users[1].id,
      },
    }),
  ]);

  const brunchGroup = await prisma.group.create({
    data: {
      name: "Weekend Brunch Club",
      code: "BRUNCH-NYC",
      pin: null,
      members: {
        connect: [
          { id: users[2].id },
          { id: users[4].id },
          { id: users[5].id },
        ],
      },
    },
    include: { members: true },
  });

  const brunchExpenses = [
    {
      description: "Brunch at Balthazar (5 people)",
      amount: 180,
      payerId: users[2].id,
      splits: [
        { debtorId: users[2].id, amount: 60 },
        { debtorId: users[4].id, amount: 60 },
        { debtorId: users[5].id, amount: 60 },
      ],
    },
    {
      description: "Coffee & pastries",
      amount: 45,
      payerId: users[4].id,
      splits: [
        { debtorId: users[2].id, amount: 15 },
        { debtorId: users[4].id, amount: 15 },
        { debtorId: users[5].id, amount: 15 },
      ],
    },
    {
      description: "Brunch at Via Carota",
      amount: 210,
      payerId: users[5].id,
      splits: [
        { debtorId: users[2].id, amount: 70 },
        { debtorId: users[4].id, amount: 70 },
        { debtorId: users[5].id, amount: 70 },
      ],
    },
  ];

  const brunchTransactions = await Promise.all(
    brunchExpenses.map((expense, idx) =>
      prisma.transaction.create({
        data: {
          description: expense.description,
          amount: expense.amount,
          type: "expense",
          date: new Date(2025, 1, idx * 7 + 1),
          groupId: brunchGroup.id,
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

  await Promise.all([
    prisma.transaction.create({
      data: {
        description: "Payment",
        amount: 60,
        type: "settlement",
        date: new Date(2025, 1, 10),
        groupId: brunchGroup.id,
        senderId: users[2].id,
        receiverId: users[4].id,
      },
    }),
  ]);

  await prisma.split.update({
    where: { id: brunchTransactions[0].splits[1].id },
    data: { isPaid: true },
  });

  await prisma.group.create({
    data: {
      name: "DEMO_SEED_MARKER",
      code: DEMO_MARKER,
      members: {
        connect: [{ id: users[0].id }],
      },
    },
  });

  return await getDemoData();
}

export async function getDemoData() {
  const groups = await prisma.group.findMany({
    where: {
      code: {
        in: ["BALI-2025", "APART-Q1", "BRUNCH-NYC"],
      },
    },
    include: {
      members: true,
      transactions: {
        include: {
          payer: true,
          sender: true,
          receiver: true,
          splits: {
            include: { debtor: true },
          },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return groups;
}

export async function resetDemoData() {
  const groupCodes = ["BALI-2025", "APART-Q1", "BRUNCH-NYC", DEMO_MARKER];

  for (const code of groupCodes) {
    const group = await prisma.group.findUnique({
      where: { code },
    });
    if (group) {
      await prisma.group.delete({
        where: { id: group.id },
      });
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
    const user = await prisma.user.findFirst({
      where: { email },
    });
    if (user) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  }
}
