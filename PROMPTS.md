# What I asked the AI

Keep a short log. One entry per prompt is enough.

| What I asked (paste or summarize) | What happened | What I had to fix or check |
| --- | --- | --- |
| I asked for a finance tracker to record expenses and keep track of budgets. | Built a monthly tracker with categories, expense entry, budget comparisons, a database, and sample data. | I ran `node db/load.js` and opened the app to check the database rows appeared. |
| I asked for help when `npm install` failed with `ENOTEMPTY`, then `npm run create-db` and `npm run check` could not find `mssql`. | A clean `npm ci` installed the project dependencies. The Azure `EBADENGINE` messages were warnings; the project runs on Node 20. | I reran `npm run create-db` and `npm run check` in my Mac terminal while connected to UW Wi-Fi; both succeeded. |
| | | |
