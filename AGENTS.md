When working with this repository, please ensure the following steps are taken for D1 database setup:

1.  Set the `d1_databases` binding to `DB` in `packages/worker-main/wrangler.toml`.
2.  Use the following `database_id`: `93a596dc-93c2-49ef-8e75-b8f4ccb1e246`.
3.  Set up a `migrations_dir` on the `d1_database` binding pointing to the migrations folder, which contains `0001_init.sql`.
4.  Create a `db:migrate` rule in `package.json`: `"db:migrate": "npx wrangler d1 migrations apply DB --remote"`.
5.  Create a `deploy` rule in `package.json`: `"deploy": "npm run db:migrate && wrangler deploy"`.
