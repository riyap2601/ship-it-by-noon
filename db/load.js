require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

async function main() {
  if (!config.database || !config.password) throw new Error('Set DB_NAME and DB_PASSWORD in .env first.');
  const pool = await sql.connect(config);
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.request().batch(schema);
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Categories)
      BEGIN
        INSERT INTO dbo.Categories (Name) VALUES
          (N'Housing'), (N'Food'), (N'Transport'), (N'Bills'), (N'Fun'), (N'Other');
      END;
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Budgets)
      BEGIN
        DECLARE @month char(7) = CONVERT(char(7), GETDATE(), 126);
        INSERT INTO dbo.Budgets (BudgetMonth, CategoryID, Amount)
        SELECT @month, CategoryID,
          CASE Name WHEN N'Housing' THEN 1200 WHEN N'Food' THEN 450 WHEN N'Transport' THEN 180
            WHEN N'Bills' THEN 160 WHEN N'Fun' THEN 200 ELSE 100 END
        FROM dbo.Categories;
      END;
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Expenses)
      BEGIN
        DECLARE @today date = CAST(GETDATE() AS date);
        INSERT INTO dbo.Expenses (Description, Amount, ExpenseDate, CategoryID)
        SELECT v.Description, v.Amount, DATEADD(day, v.DaysAgo * -1, @today), c.CategoryID
        FROM (VALUES
          (N'Weekly groceries', 82.45, 1, N'Food'),
          (N'Bus pass', 45.00, 3, N'Transport'),
          (N'Coffee with a friend', 12.80, 4, N'Fun'),
          (N'Internet bill', 59.99, 6, N'Bills'),
          (N'Produce market', 34.20, 9, N'Food'),
          (N'Takeout dinner', 27.50, 12, N'Food'),
          (N'Movie tickets', 31.00, 14, N'Fun'),
          (N'Household supplies', 22.18, 18, N'Other')
        ) AS v(Description, Amount, DaysAgo, CategoryName)
        JOIN dbo.Categories c ON c.Name = v.CategoryName;
      END;
    `);
    console.log('Database is ready. Sample categories, budgets, and expenses are loaded.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('Could not load the finance tracker database:', err.message);
  process.exitCode = 1;
});
