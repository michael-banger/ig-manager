export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version',
      }});
    }
    const url = new URL(request.url);
    const notionUrl = 'https://api.notion.com' + url.pathname + url.search;
    const response = await fetch(notionUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }});
  }
};
