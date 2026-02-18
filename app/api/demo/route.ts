import { NextResponse } from "next/server";
import { seedDemoData, resetDemoData } from "../../lib/demo-seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "reset") {
      await resetDemoData();
      const groups = await seedDemoData();
      return NextResponse.json({
        status: "reset",
        message: "Demo data has been reset",
        groups,
      });
    }

    const groups = await seedDemoData();

    const response = {
      status: "success",
      message: "Demo data ready for exploration",
      groups: groups.map((group) => ({
        ...group,
        joinCode: group.code,
        hasPin: !!group.pin,
      })),
      instructions: {
        description:
          "GoodTerms is a group expense splitter. These demo groups show realistic expense tracking and settlement scenarios.",
        groups: [
          {
            name: "Bali Trip 2025",
            code: "BALI-2025",
            description:
              "Vacation group with shared lodging, activities, and dining. Shows expenses split multiple ways with some debts settled and others pending.",
            memberCount: 4,
          },
          {
            name: "Apartment Q1 Rent",
            code: "APART-Q1",
            description:
              "Roommate shared expenses (rent, utilities, groceries). Protected with PIN (1234). Demonstrates ongoing recurring costs with mixed settlement states.",
            memberCount: 3,
            pin: "1234",
          },
          {
            name: "Weekend Brunch Club",
            code: "BRUNCH-NYC",
            description:
              "Regular group outings with consistent split amounts. Shows simpler expense tracking for repeating social events.",
            memberCount: 3,
          },
        ],
        nextSteps: [
          "Copy a group code (e.g., BALI-2025) and use it to join the group",
          "Explore the dashboard to see member balances (who owes whom)",
          "View transaction history with expense breakdowns",
          "See how settlements reduce outstanding balances",
        ],
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Demo endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to seed demo data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
