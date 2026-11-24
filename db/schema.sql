-- Personal spending categories, monthly budgets, and expense transactions.
IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Categories (
    CategoryID int IDENTITY(1,1) PRIMARY KEY,
    Name nvarchar(50) NOT NULL UNIQUE
  );
END;

IF OBJECT_ID(N'dbo.Budgets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Budgets (
    BudgetID int IDENTITY(1,1) PRIMARY KEY,
    BudgetMonth char(7) NOT NULL,
    CategoryID int NOT NULL,
    Amount decimal(10,2) NOT NULL CHECK (Amount >= 0),
    CONSTRAINT FK_Budgets_Categories FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID),
    CONSTRAINT UQ_Budgets_Month_Category UNIQUE (BudgetMonth, CategoryID)
  );
END;

IF OBJECT_ID(N'dbo.Expenses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Expenses (
    ExpenseID int IDENTITY(1,1) PRIMARY KEY,
    Description nvarchar(120) NOT NULL,
    Amount decimal(10,2) NOT NULL CHECK (Amount > 0),
    ExpenseDate date NOT NULL,
    CategoryID int NOT NULL,
    CONSTRAINT FK_Expenses_Categories FOREIGN KEY (CategoryID) REFERENCES dbo.Categories(CategoryID)
  );
END;
