import { Hono } from 'hono';

export const frontend = new Hono();

frontend.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Health Dashboard</title>
</head>
<body>
    <h1>Workspace Health Dashboard</h1>
    <button id="run-health">Run Health Checks</button>
    <pre id="output"></pre>
    <script>
      document.getElementById('run-health').addEventListener('click', async () => {
        const res = await fetch('/health/run', { method: 'POST' });
        const json = await res.json();
        document.getElementById('output').textContent = JSON.stringify(json, null, 2);
      });
    </script>
</body>
</html>
  `);
});
