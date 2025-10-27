import { Hono } from 'hono';

export const frontend = new Hono<{ Bindings: { ASSETS: Fetcher } }>();

frontend.get('*', (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});
