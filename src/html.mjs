import { readFile } from 'node:fs/promises';

let cachedHTML;

try {
  cachedHTML = await readFile('./src/base.html', { encoding: 'utf8' });
} catch (err) {
  console.error('Error reading file:', err);
  cachedHTML = null;
}

export function getHTML(change_id) {
  if (cachedHTML === null) {
    return [
      500,
      'Internal Server Error. If you are the Server Administrator, please check the console for more information.'
    ];
  }

  return [200, cachedHTML];
}