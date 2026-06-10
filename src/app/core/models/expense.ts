export type ExpenseCategory =
  | 'Transport'
  | 'Hotel'
  | 'Entry'
  | 'Food'
  | 'Other';

export interface Expense {
  id: string;
  eventId: string;
  category: ExpenseCategory;
  amount: number;
  currency: 'EUR';
  notes?: string;
  createdAt: number;
}
