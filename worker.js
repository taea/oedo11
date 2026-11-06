// docs.kani.show — カニ省の資料置き場。
// /oedo11/... を剥がして、このリポジトリの静的ファイル（ASSETS）から返す。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/oedo11') return Response.redirect(`${url.origin}/oedo11/${url.search}`, 301);
    if (!url.pathname.startsWith('/oedo11/')) return Response.redirect('https://kani.show/', 302);
    url.pathname = url.pathname.slice('/oedo11'.length);
    const res = await env.ASSETS.fetch(new Request(url, request));
    // assets が返すリダイレクト（/index.html → / など）に /oedo11 を付け直す
    const loc = res.headers.get('Location');
    if (res.status >= 300 && res.status < 400 && loc) {
      const to = new URL(loc, url);
      if (to.origin === url.origin && !to.pathname.startsWith('/oedo11/')) {
        to.pathname = '/oedo11' + to.pathname;
        const headers = new Headers(res.headers);
        headers.set('Location', to.pathname + to.search);
        return new Response(res.body, { status: res.status, headers });
      }
    }
    return res;
  },
};
