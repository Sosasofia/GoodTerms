-- This migration supports databases created from the previous Transaction/User
-- schema as well as empty databases.

DO $$
BEGIN
    IF to_regclass('"Transaction"') IS NOT NULL THEN
        ALTER TABLE "Transaction" RENAME TO "Expense";
    END IF;

    IF to_regclass('"Split"') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'Split'
             AND column_name = 'transactionId'
       ) THEN
        ALTER TABLE "Split" RENAME COLUMN "transactionId" TO "expenseId";
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "guestId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pin" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'expense',
    "groupId" TEXT NOT NULL,
    "payerId" TEXT,
    "senderId" TEXT,
    "receiverId" TEXT,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Split" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "expenseId" TEXT NOT NULL,
    "debtorId" TEXT NOT NULL,
    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- Preserve the old group membership relation and users referenced by expenses.
DO $$
BEGIN
    IF to_regclass('"_GroupMembers"') IS NOT NULL THEN
        INSERT INTO "Member" ("id", "name", "groupId", "userId")
        SELECT
            md5('member:' || g."id" || ':' || u."id")::uuid::text,
            u."name",
            g."id",
            u."id"
        FROM "_GroupMembers" gm
        JOIN "Group" g
          ON (gm."A" = g."id" AND gm."B" IN (SELECT "id" FROM "User"))
          OR (gm."B" = g."id" AND gm."A" IN (SELECT "id" FROM "User"))
        JOIN "User" u
          ON (gm."A" = u."id" AND gm."B" = g."id")
          OR (gm."B" = u."id" AND gm."A" = g."id")
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END
$$;

INSERT INTO "Member" ("id", "name", "groupId", "userId")
SELECT
    md5('member:' || e."groupId" || ':' || refs."userId")::uuid::text,
    u."name",
    e."groupId",
    refs."userId"
FROM "Expense" e
CROSS JOIN LATERAL (
    VALUES (e."payerId"), (e."senderId"), (e."receiverId")
) refs("userId")
JOIN "User" u ON u."id" = refs."userId"
WHERE refs."userId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Member" ("id", "name", "groupId", "userId")
SELECT
    md5('member:' || e."groupId" || ':' || s."debtorId")::uuid::text,
    u."name",
    e."groupId",
    s."debtorId"
FROM "Split" s
JOIN "Expense" e ON e."id" = s."expenseId"
JOIN "User" u ON u."id" = s."debtorId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "Expense" e
SET "payerId" = m."id"
FROM "Member" m
WHERE e."payerId" = m."userId"
  AND e."groupId" = m."groupId";

UPDATE "Expense" e
SET "senderId" = m."id"
FROM "Member" m
WHERE e."senderId" = m."userId"
  AND e."groupId" = m."groupId";

UPDATE "Expense" e
SET "receiverId" = m."id"
FROM "Member" m
WHERE e."receiverId" = m."userId"
  AND e."groupId" = m."groupId";

UPDATE "Split" s
SET "debtorId" = m."id"
FROM "Expense" e
JOIN "Member" m
  ON m."userId" = s."debtorId"
 AND m."groupId" = e."groupId"
WHERE s."expenseId" = e."id";

DROP TABLE IF EXISTS "_GroupMembers";

ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_ownerId_fkey";
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_groupId_fkey";
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_userId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Transaction_groupId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_groupId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Transaction_payerId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_payerId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Transaction_senderId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_senderId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Transaction_receiverId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_receiverId_fkey";
ALTER TABLE "Split" DROP CONSTRAINT IF EXISTS "Split_transactionId_fkey";
ALTER TABLE "Split" DROP CONSTRAINT IF EXISTS "Split_expenseId_fkey";
ALTER TABLE "Split" DROP CONSTRAINT IF EXISTS "Split_debtorId_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_guestId_key" ON "User"("guestId");
CREATE UNIQUE INDEX IF NOT EXISTS "Group_code_key" ON "Group"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Member_groupId_userId_key" ON "Member"("groupId", "userId");

ALTER TABLE "Group"
    ADD CONSTRAINT "Group_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Member"
    ADD CONSTRAINT "Member_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Member"
    ADD CONSTRAINT "Member_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_payerId_fkey"
    FOREIGN KEY ("payerId") REFERENCES "Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Split"
    ADD CONSTRAINT "Split_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Split"
    ADD CONSTRAINT "Split_debtorId_fkey"
    FOREIGN KEY ("debtorId") REFERENCES "Member"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
