require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'web')));

const dbConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

let poolPromise;
function getPool() {
  if (!process.env.DB_NAME || !process.env.DB_PASSWORD) {
    throw new Error('Set DB_NAME and DB_PASSWORD in your .env file first.');
  }
  if (!poolPromise) poolPromise = sql.connect(dbConfig);
  return poolPromise;
}

function validMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

app.get('/api/dashboard', async (req, res) => {
  const month = req.query.month;
  if (!validMonth(month)) return res.status(400).json({ error: 'Choose a valid month.' });
  try {
    const pool = await getPool();
    const summary = await pool.request().input('month', sql.Char(7), month).query(`
      SELECT c.CategoryID, c.Name AS category,
        COALESCE(b.Amount, 0) AS budget,
        COALESCE(SUM(e.Amount), 0) AS spent
      FROM dbo.Categories c
      LEFT JOIN dbo.Budgets b ON b.CategoryID = c.CategoryID AND b.BudgetMonth = @month
      LEFT JOIN dbo.Expenses e ON e.CategoryID = c.CategoryID
        AND CONVERT(char(7), e.ExpenseDate, 126) = @month
      GROUP BY c.CategoryID, c.Name, b.Amount
      ORDER BY c.Name;
    `);
    const expenses = await pool.request().input('month', sql.Char(7), month).query(`
      SELECT e.ExpenseID AS id, e.Description AS description, e.Amount AS amount,
        CONVERT(char(10), e.ExpenseDate, 23) AS date, c.Name AS category
      FROM dbo.Expenses e JOIN dbo.Categories c ON c.CategoryID = e.CategoryID
      WHERE CONVERT(char(7), e.ExpenseDate, 126) = @month
      ORDER BY e.ExpenseDate DESC, e.ExpenseID DESC;
    `);
    res.json({ budgets: summary.recordset, expenses: expenses.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the budget. Check your database setup and try again.' });
  }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT CategoryID AS id, Name AS name FROM dbo.Categories ORDER BY Name;');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load categories. Run node db/load.js first.' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { description, amount, date, categoryId } = req.body;
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 120 ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 1000000 ||
      typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0) {
    return res.status(400).json({ error: 'Enter a description, positive amount, date, and category.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('description', sql.NVarChar(120), description.trim())
      .input('amount', sql.Decimal(10, 2), Number(amount))
      .input('date', sql.Date, date)
      .input('categoryId', sql.Int, Number(categoryId))
      .query('INSERT INTO dbo.Expenses (Description, Amount, ExpenseDate, CategoryID) VALUES (@description, @amount, @date, @categoryId);');
    res.status(201).json({ message: 'Expense saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save expense. Check that the category exists.' });
  }
});

app.put('/api/budgets', async (req, res) => {
  const { month, categoryId, amount } = req.body;
  if (!validMonth(month) || !Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0 ||
      !Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 1000000) {
    return res.status(400).json({ error: 'Enter a valid month, category, and budget (zero or more).' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('month', sql.Char(7), month)
      .input('categoryId', sql.Int, Number(categoryId))
      .input('amount', sql.Decimal(10, 2), Number(amount))
      .query(`
        UPDATE dbo.Budgets SET Amount = @amount WHERE BudgetMonth = @month AND CategoryID = @categoryId;
        IF @@ROWCOUNT = 0
          INSERT INTO dbo.Budgets (BudgetMonth, CategoryID, Amount) VALUES (@month, @categoryId, @amount);
      `);
    res.json({ message: 'Budget saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save budget. Check that the category exists.' });
  }
});

app.listen(port, () => console.log(`Finance tracker running at http://localhost:${port}`));
