// Service worker: faz o jogo abrir sem internet e se atualizar sozinho quando há internet.
// Estratégia "rede primeiro": busca a versão mais nova e, se estiver offline, usa a guardada.
// Por isso não é preciso mudar número de versão a cada atualização.
const CACHE = 'poker';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/temas.css', 'css/base.css', 'css/telas.css', 'css/jogo.css', 'css/blackjack.css',
  'js/main.js', 'js/util.js', 'js/cartas.js', 'js/config.js', 'js/armazenamento.js', 'js/som.js',
  'js/estatisticas.js', 'js/estado.js', 'js/jogo.js', 'js/bots.js', 'js/interface.js', 'js/personalizada.js', 'js/icones.js', 'js/blackjack.js', 'js/arcade.js', 'js/interface21.js', 'js/acoes21.js',
  'icones/icon-192.png', 'icones/icon-512.png', 'icones/icon-maskable-512.png', 'icones/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(req.url, {cache: 'no-cache'}))
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
