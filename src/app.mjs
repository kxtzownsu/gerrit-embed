import express from 'express';
import 'dotenv/config';
const app = express();

const githubURL = "https://github.com/kxtzownsu/gerrit-embed";
const baseURL = (process.env.BASE_URL !== undefined) ? process.env.BASE_URL : githubURL + "#configure";
const PORT = (process.env.PORT !== undefined) ? process.env.PORT : '3000';

app.get('/:change_id', (req, res) => {
  console.log("change id: " + req.params.change_id);
  res.status(200).send();
})

app.get('/', (req, res) => {
  res.redirect(baseURL)
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`listening on 0.0.0.0:${PORT}`);
});