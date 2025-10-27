import { Hono } from 'hono';
import { api } from './api';
import { health } from './health';
import { frontend } from './frontend';
import { scheduled } from './scheduled';

const app = new Hono();

app.route('/api', api);
app.route('/health', health);
app.route('/', frontend);

export default {
  fetch: app.fetch,
  scheduled: scheduled,
};
