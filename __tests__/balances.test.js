import {
  getOptimizedSettlements,
  calculateBalances,
  getUserSettlementSuggestions,
} from '../src/services/balances';

describe('settlement optimization', () => {
  it('reduces a three-way imbalance to the minimum number of transfers', () => {
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c1' };
    const bob = { id: 'bob', name: 'Bob', clerkId: 'c2' };
    const carol = { id: 'carol', name: 'Carol', clerkId: 'c3' };

    const group = {
      id: 'group-1',
      name: 'Trip',
      code: 'TRIP-1234',
      members: [alice, bob, carol],
    };

    const items = [
      {
        id: 'expense-1',
        type: 'expense',
        description: 'Dinner',
        amount: 120,
        payer: alice,
        splits: [
          { id: 'split-a', debtor: alice, amount: 40, isPaid: false },
          { id: 'split-b', debtor: bob, amount: 40, isPaid: false },
          { id: 'split-c', debtor: carol, amount: 40, isPaid: false },
        ],
      },
      {
        id: 'expense-2',
        type: 'expense',
        description: 'Drinks',
        amount: 60,
        payer: bob,
        splits: [
          { id: 'split-d', debtor: alice, amount: 20, isPaid: false },
          { id: 'split-e', debtor: bob, amount: 20, isPaid: false },
          { id: 'split-f', debtor: carol, amount: 20, isPaid: false },
        ],
      },
    ];

    const balances = calculateBalances(group, items);
    expect(balances).toMatchObject({
      alice: 60,
      bob: 0,
      carol: -60,
    });

    const suggestions = getOptimizedSettlements(group, items);
    expect(suggestions).toEqual([
      { fromUserId: 'carol', toUserId: 'alice', amount: 60 },
    ]);
  });

  it('uses user ids to avoid collisions when names repeat', () => {
    const sam1 = { id: 'sam-1', name: 'Sam', clerkId: 'c1' };
    const sam2 = { id: 'sam-2', name: 'Sam', clerkId: 'c2' };
    const riley = { id: 'riley', name: 'Riley', clerkId: 'c3' };

    const group = {
      id: 'group-2',
      name: 'Roommates',
      code: 'ROOM-5678',
      members: [sam1, sam2, riley],
    };

    const items = [
      {
        id: 'expense-3',
        type: 'expense',
        description: 'Groceries',
        amount: 60,
        payer: sam1,
        splits: [
          { id: 'split-s1', debtor: sam1, amount: 20, isPaid: false },
          { id: 'split-s2', debtor: sam2, amount: 20, isPaid: false },
          { id: 'split-r', debtor: riley, amount: 20, isPaid: false },
        ],
      },
    ];

    const balances = calculateBalances(group, items);
    expect(balances).toMatchObject({
      'sam-1': 40,
      'sam-2': -20,
      riley: -20,
    });

    expect(getOptimizedSettlements(group, items)).toEqual([
      { fromUserId: 'sam-2', toUserId: 'sam-1', amount: 20 },
      { fromUserId: 'riley', toUserId: 'sam-1', amount: 20 },
    ]);
  });

  it('applies settlement payments in the balance calculation', () => {
    const sofia = { id: 'sofia', name: 'Sofia', clerkId: 'c1' };
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c2' };
    const group = {
      id: 'group-payment',
      name: 'Payments',
      code: 'PAY-1234',
      members: [sofia, alice],
    };
    const items = [
      {
        id: 'expense-payment',
        type: 'expense',
        description: 'Dinner',
        amount: 50,
        payer: alice,
        splits: [
          { id: 'split-payment', debtor: sofia, amount: 50, isPaid: false },
        ],
      },
      {
        id: 'settlement-payment',
        type: 'settlement',
        amount: 20,
        sender: sofia,
        receiver: alice,
      },
    ];

    expect(calculateBalances(group, items)).toMatchObject({
      sofia: -30,
      alice: 30,
    });

    expect(getUserSettlementSuggestions(group, items, 'sofia')).toEqual([
      {
        fromUserId: 'sofia',
        toUserId: 'alice',
        amount: 30,
        splitIds: ['split-payment'],
      },
    ]);
  });

  it('keeps direct unpaid debts available when another expense reverses the balance', () => {
    const sofia = { id: 'sofia', name: 'Sofia', clerkId: 'c1' };
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c2' };
    const group = {
      id: 'group-reverse',
      name: 'Reverse debts',
      code: 'REV-1234',
      members: [sofia, alice],
    };
    const items = [
      {
        id: 'expense-alice',
        type: 'expense',
        description: 'Alice expense',
        amount: 50,
        payer: alice,
        splits: [
          { id: 'split-alice', debtor: sofia, amount: 25, isPaid: false },
        ],
      },
      {
        id: 'expense-sofia',
        type: 'expense',
        description: 'Sofia expense',
        amount: 20,
        payer: sofia,
        splits: [
          { id: 'split-sofia', debtor: alice, amount: 10, isPaid: false },
        ],
      },
    ];

    expect(getUserSettlementSuggestions(group, items, 'sofia')).toEqual([
      {
        fromUserId: 'sofia',
        toUserId: 'alice',
        amount: 25,
        splitIds: ['split-alice'],
      },
    ]);
    expect(getUserSettlementSuggestions(group, items, 'sofia', 'settleAll')).toEqual([
      {
        fromUserId: 'sofia',
        toUserId: 'alice',
        amount: 15,
        splitIds: ['split-alice'],
        offsetSplitIds: ['split-sofia'],
      },
    ]);
  });

  it('returns only the balances the selected payer owes to other members', () => {
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c1' };
    const bob = { id: 'bob', name: 'Bob', clerkId: 'c2' };
    const carol = { id: 'carol', name: 'Carol', clerkId: 'c3' };

    const group = {
      id: 'group-3',
      name: 'Bali Trip',
      code: 'BALI-2025',
      members: [alice, bob, carol],
    };

    const items = [
      {
        id: 'expense-4',
        type: 'expense',
        description: 'Yoga class',
        amount: 150,
        payer: alice,
        splits: [
          { id: 'split-1', debtor: carol, amount: 75, isPaid: false },
          { id: 'split-2', debtor: bob, amount: 75, isPaid: false },
        ],
      },
      {
        id: 'expense-5',
        type: 'expense',
        description: 'Dinner',
        amount: 120,
        payer: bob,
        splits: [
          { id: 'split-3', debtor: carol, amount: 60, isPaid: false },
          { id: 'split-4', debtor: bob, amount: 60, isPaid: false },
        ],
      },
    ];

    expect(getUserSettlementSuggestions(group, items, 'carol')).toEqual([
      { fromUserId: 'carol', toUserId: 'alice', amount: 75, splitIds: ['split-1'] },
      { fromUserId: 'carol', toUserId: 'bob', amount: 60, splitIds: ['split-3'] },
    ]);
  });

  it('prioritizes expenses with earlier due dates in the payer suggestions', () => {
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c1' };
    const bob = { id: 'bob', name: 'Bob', clerkId: 'c2' };
    const carol = { id: 'carol', name: 'Carol', clerkId: 'c3' };

    const group = {
      id: 'group-4',
      name: 'Due Date Trip',
      code: 'DUE-2025',
      members: [alice, bob, carol],
    };

    const items = [
      {
        id: 'expense-6',
        type: 'expense',
        description: 'Flights',
        amount: 150,
        dueDate: '2026-09-10T00:00:00.000Z',
        payer: alice,
        splits: [
          { id: 'split-10', debtor: carol, amount: 75, isPaid: false },
          { id: 'split-11', debtor: bob, amount: 75, isPaid: false },
        ],
      },
      {
        id: 'expense-7',
        type: 'expense',
        description: 'Hotel',
        amount: 120,
        dueDate: '2026-09-01T00:00:00.000Z',
        payer: bob,
        splits: [
          { id: 'split-12', debtor: carol, amount: 60, isPaid: false },
          { id: 'split-13', debtor: bob, amount: 60, isPaid: false },
        ],
      },
    ];

    expect(getUserSettlementSuggestions(group, items, 'carol')).toEqual([
      {
        fromUserId: 'carol',
        toUserId: 'bob',
        amount: 60,
        splitIds: ['split-12'],
        dueDate: '2026-09-01T00:00:00.000Z',
      },
      {
        fromUserId: 'carol',
        toUserId: 'alice',
        amount: 75,
        splitIds: ['split-10'],
        dueDate: '2026-09-10T00:00:00.000Z',
      },
    ]);
  });

  it('supports due-date-first and net settle-all suggestions', () => {
    const sofia = { id: 'sofia', name: 'Sofia', clerkId: 'c1' };
    const alice = { id: 'alice', name: 'Alice', clerkId: 'c2' };
    const group = {
      id: 'group-5',
      name: 'Netting Trip',
      code: 'NET-2025',
      members: [sofia, alice],
    };
    const items = [
      {
        id: 'expense-8',
        type: 'expense',
        description: 'Hotel',
        amount: 50,
        dueDate: '2026-09-10T00:00:00.000Z',
        payer: sofia,
        splits: [
          { id: 'split-14', debtor: alice, amount: 50, isPaid: false },
        ],
      },
      {
        id: 'expense-10',
        type: 'expense',
        description: 'Breakfast',
        amount: 20,
        dueDate: '2026-09-05T00:00:00.000Z',
        payer: sofia,
        splits: [
          { id: 'split-16', debtor: alice, amount: 20, isPaid: false },
        ],
      },
      {
        id: 'expense-9',
        type: 'expense',
        description: 'Taxi',
        amount: 10,
        dueDate: '2026-09-01T00:00:00.000Z',
        payer: alice,
        splits: [
          { id: 'split-15', debtor: sofia, amount: 10, isPaid: false },
        ],
      },
    ];

    expect(getUserSettlementSuggestions(group, items, 'alice', 'dueDate')).toEqual([
      {
        fromUserId: 'alice',
        toUserId: 'sofia',
        amount: 20,
        splitIds: ['split-16'],
        dueDate: '2026-09-05T00:00:00.000Z',
      },
      {
        fromUserId: 'alice',
        toUserId: 'sofia',
        amount: 50,
        splitIds: ['split-14'],
        dueDate: '2026-09-10T00:00:00.000Z',
      },
    ]);
    expect(getUserSettlementSuggestions(group, items, 'alice', 'settleAll')).toEqual([
      {
        fromUserId: 'alice',
        toUserId: 'sofia',
        amount: 60,
        splitIds: ['split-16', 'split-14'],
        offsetSplitIds: ['split-15'],
        dueDate: '2026-09-05T00:00:00.000Z',
      },
    ]);
  });
});
