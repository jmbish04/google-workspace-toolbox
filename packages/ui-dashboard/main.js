document.getElementById('run-health').addEventListener('click', async () => {
const res = await fetch('/health/run', { method: 'POST' });
const json = await res.json();
document.getElementById('output').textContent = JSON.stringify(json, null, 2);
});
