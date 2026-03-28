/**
 * Chucho Chat — Service Worker
 * Maneja notificaciones push en segundo plano
 * y sincronización periódica de mensajes.
 */

const CACHE_NAME = 'chucho-chat-v1';

// ─── Instalación ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// ─── Notificaciones Push recibidas del servidor ──────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try { data = event.data.json(); } catch (_) { data = { title: 'Chucho Chat', body: event.data.text() }; }

    const title   = data.title   || 'Nuevo mensaje';
    const options = {
        body:    data.body    || 'Tienes un mensaje nuevo',
        icon:    data.icon    || '/favicon.ico',
        badge:   '/favicon.ico',
        tag:     data.tag     || 'chucho-msg',
        renotify: true,
        data:    { url: data.url || '/', conv_id: data.conv_id || 0 },
        actions: [
            { action: 'open',    title: '📨 Abrir'   },
            { action: 'dismiss', title: 'Descartar'  }
        ],
        vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Clic en la notificación ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.postMessage({ type: 'OPEN_CONV', conv_id: event.notification.data?.conv_id });
                    return;
                }
            }
            return clients.openWindow(url);
        })
    );
});

// ─── Sync periódico (Background Sync) ────────────────────────────────
// Se activa cada cierto tiempo aunque el tab esté cerrado (Chrome/Android)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-messages') {
        event.waitUntil(checkNewMessages());
    }
});

async function checkNewMessages() {
    try {
        const resp = await fetch('/api/chat?action=notificaciones_pendientes', {
            credentials: 'include'
        });
        if (!resp.ok) return;

        const data = await resp.json();
        if (!data.exito || !data.mensajes?.length) return;

        // Agrupar por remitente
        const porRemitente = {};
        for (const m of data.mensajes) {
            const nombre = m.remitente_nombre || 'Alguien';
            if (!porRemitente[nombre]) porRemitente[nombre] = [];
            porRemitente[nombre].push(m.contenido || 'Mensaje nuevo');
        }

        for (const [nombre, msgs] of Object.entries(porRemitente)) {
            await self.registration.showNotification(`💬 ${nombre}`, {
                body:     msgs.length === 1 ? msgs[0] : `${msgs.length} mensajes nuevos`,
                icon:     '/favicon.ico',
                badge:    '/favicon.ico',
                tag:      `chucho-${nombre}`,
                renotify: true,
                data:     { url: '/' },
                vibrate:  [150, 100, 150]
            });
        }
    } catch (_) {}
}

// Escuchar mensajes del tab principal
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
