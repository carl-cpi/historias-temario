// Service worker de la versión protegida con contraseña (GENERADO por preparar-web.py --github).
// El juego llega cifrado (juego.bin); la página de entrada lo descifra y lo guarda en la caché «temario-historias-*».
// Este service worker sirve el juego desde esa caché, sin red. La página de entrada se guarda también para abrirla sin conexión.
const VERSION = '20261029-e2537c';
const CARGADOR = 'temario-cargador-' + VERSION;
const BASE = self.registration.scope;
const PROPIOS = ['./', 'index.html', 'manifest.webmanifest', 'icono-192.png', 'icono-180.png', 'icono-512.png', 'icono-maskable-512.png'];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CARGADOR).then(c => c.addAll(PROPIOS.map(p => new URL(p, BASE).href))).catch(() => {}));
});
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('temario-cargador-') && k !== CARGADOR) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || !req.url.startsWith(BASE)) return;
  let url = req.url.split('#')[0];
  const ruta = url.slice(BASE.length).split('?')[0];
  if (ruta === 'juego.bin' || ruta === 'sw.js') return; // siempre de la red
  if (url.endsWith('/')) url += 'index.html';
  ev.respondWith((async () => {
    if (ruta.startsWith('app/')) { // el juego: solo desde la caché
      const r = await caches.match(url, { ignoreSearch: true });
      if (r) return r;
      if (req.mode === 'navigate') return Response.redirect(BASE, 302); // no instalado: a la página de entrada
      return new Response('', { status: 404 });
    }
    try { // página de entrada: de la red (revalidando, sin la caché HTTP de GitHub) si hay; si no, de la caché
      const r = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
      if (r.ok && PROPIOS.includes(ruta || './')) (await caches.open(CARGADOR)).put(url, r.clone());
      return r;
    } catch (err) {
      const r = await caches.match(url, { ignoreSearch: true });
      if (r) return r;
      throw err;
    }
  })());
});

self.addEventListener('message', ev => {
  if (ev.data?.tipo !== 'estado') return;
  ev.waitUntil((async () => {
    const k = (await caches.keys()).find(n => n.startsWith('temario-historias-'));
    const n = k ? (await (await caches.open(k)).keys()).length : 0;
    ev.source.postMessage({ tipo: 'estado', version: k?.slice('temario-historias-'.length) ?? null, total: n, guardados: n });
  })());
});
