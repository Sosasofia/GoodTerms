const EXPENSE_DESCRIPTION_MIN_LENGTH = 3;
const EXPENSE_DESCRIPTION_MAX_LENGTH = 50;

const expenseDescriptionPattern =
  /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s.,!?'"()&:/+\-#%]+$/u;

export function validateExpenseDescription(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Expense title is required.";
  }

  const description = value.trim();

  if (description.length < EXPENSE_DESCRIPTION_MIN_LENGTH) {
    return `Expense title must be at least ${EXPENSE_DESCRIPTION_MIN_LENGTH} characters.`;
  }

  if (description.length > EXPENSE_DESCRIPTION_MAX_LENGTH) {
    return `Expense title must be at most ${EXPENSE_DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (!expenseDescriptionPattern.test(description)) {
    return "Expense title contains invalid characters.";
  }

  return null;
}

export {
  EXPENSE_DESCRIPTION_MIN_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
};
