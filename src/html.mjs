import { readFile } from 'node:fs/promises';
import { getGerritInfo } from './gerrit.mjs'

const RAW_KEYS = new Set(["redirect.text"]);

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const serverError = [
      500,
      'Internal Server Error. If you are the Server Administrator, please check the console for more information.'
    ];

let cachedHTML;

try {
  cachedHTML = await readFile('./src/html/embed.html', 'utf8');
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
      (_, rawKey) => {
        const key = rawKey.trim();
        const value = key.split('.').reduce((obj, part) => obj?.[part], data);

        return RAW_KEYS.has(key) ? (value ?? '') : escapeHtml(value ?? '');
      }
    );
  } catch (err) {
    console.error('Error parsing HTML:', err);
    return serverError;
  }

  html = html.replace(/<!--[\s\S]*?-->/g, '');

  return [200, html];
}