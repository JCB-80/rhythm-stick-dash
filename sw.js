// Offline-capable Service Worker for PWA & TWA Store packaging
const CACHE_PREFIX = `rhythm-stick-dash:${self.registration.scope}:`;
const CACHE_NAME = CACHE_PREFIX + 'v8';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './privacy-policy.html',
  './vendor/three-r128.min.js',
  './js/storage.js',
  './locales/i18n.js',
  './js/i18n-ext.js',
  './js/auth-ranking.js',
  './js/audio-synth.js',
  './js/runner-sprite.js',
  './js/game3d.js',
  './js/app.js',
  './assets/screens/bg_neo_syndicate_stage.png',
  './assets/characters/char_kai.png',
  './assets/characters/char_luna.png',
  './assets/characters/char_aria.png',
  './assets/sprites_i18n_frames/icon_lang_globe.png',
  './assets/sprites_i18n_frames/btn_frame_primary.png',
  './assets/sprites_i18n_frames/btn_frame_secondary.png',
  './assets/sprites_i18n_frames/btn_frame_reward_ad.png',
  './assets/sprites_i18n_frames/social_bar_kakao_blank.png',
  './assets/sprites_i18n_frames/social_bar_naver_blank.png',
  './assets/sprites_i18n_frames/social_bar_google_blank.png',
  './assets/sprites_i18n_frames/social_bar_apple_blank.png',
  './assets/sprites_i18n_frames/social_bar_guest_blank.png',
  './assets/sprites_transparent/note_tap_orb.png',
  './assets/sprites_transparent/note_swipe_cyan.png',
  './assets/sprites_transparent/note_swipe_magenta.png',
  './assets/sprites_transparent/btn_left.png',
  './assets/sprites_transparent/btn_right.png',
  './assets/sprites_transparent/btn_tap.png',
  './assets/sprites_transparent/btn_swipe.png',
  './assets/sprites_transparent/judge_perfect.png',
  './assets/sprites_transparent/judge_great.png',
  './assets/sprites_transparent/judge_miss.png',
  './assets/sprites_transparent/judge_fever.png',
  './assets/sprites_transparent/rank_s_plus.png',
  './assets/sprites_transparent/rank_a.png',
  './assets/sprites_transparent/vfx_stick_slash.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    // v6 shared its cache name across installs. Remove only this game's scoped URLs.
    if (keys.includes('rhythm-stick-dash-v6')) {
      const legacy = await caches.open('rhythm-stick-dash-v6');
      await Promise.all(CORE_ASSETS.map(path => legacy.delete(new URL(path, self.registration.scope))));
      if ((await legacy.keys()).length === 0) await caches.delete('rhythm-stick-dash-v6');
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request))
  );
});
