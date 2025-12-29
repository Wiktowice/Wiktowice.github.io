self.addEventListener('install', event => {
  console.log('Service Worker zainstalowany');
});

self.addEventListener('fetch', event => {
  // Można tu dodać cache, ale na razie zostawiamy minimalnie
});
