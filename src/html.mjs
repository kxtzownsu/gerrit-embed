function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

        return escapeHtml(value ?? '');
      }
    );
  } catch (err) {
    console.error('Error parsing HTML:', err);
    return serverError;
  }

  html = html.replace(/<!--[\s\S]*?-->/g, '');

  return [200, html];
}