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
});
