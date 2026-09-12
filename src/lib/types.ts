export interface User {
  id: string;
  name: string;
  clerkId?: string | null;
  guestId?: string | null;
  email?: string | null;
}

export interface Member {
  id: string;
  name: string;
  joinedAt?: string;
  groupId: string;
  userId?: string | null;
  user?: User | null;
}

export interface Group {
  id: string;
  name: string;
  pin?: string | null;
  code: string;
  isArchived?: boolean;
  ownerId?: string | null;
  owner?: User | null;
  members: Member[];
}

export interface Expense {
  id: string;
  type: "expense";
  description: string;
  amount: number;
  note?: string;
  date?: string | null;
  dueDate?: string | null;
  payerId: string;
  payer: Member;
  splits: Split[];
}

export interface Split {
  id: string;
  debtorId: string;
  debtor: Member;
  amount: number;
  isPaid: boolean;
}

export interface Settlement {
  id: string;
  type: "settlement";
  amount: number;
  senderId: string;
  sender: Member;
  receiverId: string;
  receiver: Member;
  date: string;
}

export type Transaction = Expense | Settlement;
