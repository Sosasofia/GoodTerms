export interface User {
  id: string;
  name: string;
  clerkId: string;
}

export interface Group {
  id: string;
  name: string;
  pin?: string;
  code: string;
  members: User[];
}

export interface Expense {
  id: string;
  type: "expense";
  description: string;
  amount: number;
  note?: string;
  payer: User;
  splits: Split[];
}

export interface Split {
  id: string;
  debtor: User;
  amount: number;
  isPaid: boolean;
}

export interface Settlement {
  id: string;
  type: "settlement";
  amount: number;
  senderId: string;
  sender: User;
  receiverId: string;
  receiver: User;
  createdAt: string;
}

export type Transaction = Expense | Settlement;
