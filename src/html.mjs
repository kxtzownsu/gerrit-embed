import { readFile } from 'node:fs/promises';
import { getGerritInfo } from './gerrit.mjs'

const serverError = [
      500,
      'Internal Server Error. If you are the Server Administrator, please check the console for more information.'
    ];

let cachedHTML;

try {
  cachedHTML = await readFile('./src/base.html', 'utf8');
} catch (err) {
  console.error('Error reading file:', err);
  cachedHTML = null;
}

export async function getHTML(change_id) {
  if (cachedHTML === null) {
    return serverError;
  }

  return parseHTML(cachedHTML, change_id);
}

export async function parseHTML(template, change_id) {
  let html = template;

  try {
    const data = await getGerritInfo(change_id);

    html = html.replace(
      /\{\{\s*([^}]+)\s*\}\}/g,
      (_, key) => {
        const value = key
          .trim()
          .split('.')
          .reduce((obj, part) => obj?.[part], data);

        return value ?? '';
      }
    );
  } catch (err) {
    console.error('Error parsing HTML:', err);
    return serverError;
  }

  html = html.replace(/<!--[\s\S]*?-->/g, '');

  return [200, html];
}