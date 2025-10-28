async function checkHealth() {
    const res = await fetch('/health');
    const json = await res.json();
    const statusEl = document.getElementById('health-status');
    statusEl.textContent = `DB OK: ${json.dbOk}, Health Agent OK: ${json.agentOk}`;
}

document.addEventListener('DOMContentLoaded', checkHealth);

document.getElementById('run-health').addEventListener('click', async () => {
    const res = await fetch('/health/run', { method: 'POST' });
    const json = await res.json();
    document.getElementById('output').textContent = JSON.stringify(json, null, 2);
});
