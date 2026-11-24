-- Replace the value below with the month to review, for example '2026-11'.
DECLARE @month char(7) = '2026-11';

-- Compare each category's spending with its budget for the selected month.
SELECT c.Name AS category,
  COALESCE(b.Amount, 0) AS budget,
  COALESCE(SUM(e.Amount), 0) AS spent,
  COALESCE(b.Amount, 0) - COALESCE(SUM(e.Amount), 0) AS remaining
FROM dbo.Categories c
LEFT JOIN dbo.Budgets b ON b.CategoryID = c.CategoryID AND b.BudgetMonth = @month
LEFT JOIN dbo.Expenses e ON e.CategoryID = c.CategoryID
  AND CONVERT(char(7), e.ExpenseDate, 126) = @month
GROUP BY c.CategoryID, c.Name, b.Amount
ORDER BY c.Name;

-- List expense transactions for the selected month.
SELECT e.Description, e.Amount, e.ExpenseDate, c.Name AS category
FROM dbo.Expenses e
JOIN dbo.Categories c ON c.CategoryID = e.CategoryID
WHERE CONVERT(char(7), e.ExpenseDate, 126) = @month
ORDER BY e.ExpenseDate DESC;
