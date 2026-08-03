import { getHTML } from './html.mjs';

import express from 'express';
import 'dotenv/config';

const app = express();

const githubURL = "https://github.com/kxtzownsu/gerrit-embed";

if (process.env.BASE_URL == undefined){
  console.error("BASE_URL not set in .env");
  process.exit(-1);
}

const PORT = (process.env.PORT !== undefined) ? process.env.PORT : '5173';
const PROTOCOL = (process.env.PROTOCOL !== undefined) ? process.env.PROTOCOL : 'https';

app.get('/:change_id', async (req, res) => {
  const [status, html] = await getHTML(req.params.change_id);
  res.status(status).send(html);
});

app.get('/', (req, res) => {
  const base_url = `${PROTOCOL}://${process.env.BASE_URL}`;
  res.redirect(base_url);
});

app.get('/report', (req, res) => {
  res.redirect(githubURL);
})

const server = app.listen({
  host: '0.0.0.0',
  port: Number(PORT)
});

server.on('listening', () => {
  console.log(`listening on 0.0.0.0:${Number(PORT)}`);
  console.log(`report any errors to ${githubURL} please and thank you`);
});

server.on('error', (err) => {
  console.error(err);
  console.error(`i hope you're thinking about reporting this to ${githubURL} (pls don't send a report if it's EADDRINUSE)`);
});