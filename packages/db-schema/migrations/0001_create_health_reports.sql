CREATE TABLE health_reports (
id TEXT PRIMARY KEY,
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
status TEXT CHECK(status IN ('RUNNING', 'ANALYZING', 'COMPLETE', 'ERROR'))
);

CREATE TABLE health_runs (
id TEXT PRIMARY KEY,
report_id TEXT,
service_name TEXT CHECK(service_name IN ('drive', 'docs', 'sheets', 'appsscript')),
status TEXT CHECK(status IN ('SUCCESS', 'FAILURE')),
FOREIGN KEY(report_id) REFERENCES health_reports(id)
);

CREATE TABLE health_logs (
id TEXT PRIMARY KEY,
run_id TEXT,
logs_json TEXT,
FOREIGN KEY(run_id) REFERENCES health_runs(id)
);

CREATE TABLE ai_analysis (
id TEXT PRIMARY KEY,
report_id TEXT,
human_summary TEXT,
dev_agent_prompt TEXT,
overall_fix_prompt TEXT,
FOREIGN KEY(report_id) REFERENCES health_reports(id) ON DELETE CASCADE
);
