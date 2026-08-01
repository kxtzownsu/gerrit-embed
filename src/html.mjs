import { readFile } from 'node:fs/promises';

let cachedHTML;

try {
  cachedHTML = await readFile('./src/base.html', { encoding: 'utf8' });
} catch (err) {
  console.error('Error reading file:', err);
  cachedHTML = null;
}

export function getHTML(change_id) {
  let html = cachedHTML;

  if (html === null) {
    return [
      500,
      'Internal Server Error. If you are the Server Administrator, please check the console for more information.'
    ];
  }

  parseHTML(html, change_id);

  return [200, html];
}

export function parseHTML(html, change_id){
  console.log(`wip, change_id: ${change_id}, html: ${html}`);
}