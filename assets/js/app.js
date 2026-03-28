/**
 * CHUCHO CHAT - JavaScript Principal
 */

// ============================================
// ESTADO GLOBAL
// ============================================
const Estado = {
    usuario: null,
    conversacionActual: null,
    conversaciones: [],
    mensajes: [],
    ultimoMensajeId: 0,
    pollTimer: null,
    refreshTimer: null,
    correoVerificacion: '',
    modoChatbot: false,
    chatbotHistorial: [],
    todosUsuarios: [],
    mediaRecorder: null,
    audioChunks: [],
    grabandoAudio: false,
    audioStream: null,
    audioContext: null,
    audioProcessor: null,
    audioSource: null,
    audioSampleRate: 44100,
    audioBufferChunks: [],
    chatRequestToken: 0,
    chatAbortController: null,
    chatbotWelcomeTimer: null,
};

const API = {
    auth: '/api/auth',
    chat: '/api/chat'
};

// ============================================
// UTILIDADES
// ============================================
async function fetchAPI(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        return await res.json();
    } catch (e) {
        if (e.name === 'AbortError') {
            return { aborted: true };
        }
        console.error('Error API:', e);
        return { error: 'Error de conexión' };
    }
}

function abortarSolicitudesChat() {
    if (Estado.chatAbortController) {
        try { Estado.chatAbortController.abort(); } catch (e) {}
    }
    Estado.chatAbortController = null;
}

function nuevaSolicitudChat() {
    abortarSolicitudesChat();
    Estado.chatAbortController = new AbortController();
    return Estado.chatAbortController;
}

function renderizarBienvenidaChatbot() {
    const lista = document.getElementById('lista-mensajes');
    if (!lista || !Estado.modoChatbot) return;

    lista.innerHTML = `
        <div class="message-date-separator"><span>Hoy</span></div>
        <div class="message-bubble message-chatbot" data-chatbot-welcome="1">
            <div class="message-text">¡Hola! 👋 Soy <strong>Chucho Bot</strong>, tu asistente con IA. Pregúntame lo que quieras y te ayudaré.</div>
            <div class="message-meta">
                <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
            </div>
        </div>`;
    scrollAlFinal();
}

function asegurarBienvenidaChatbot(intentos = 8) {
    if (Estado.chatbotWelcomeTimer) {
        clearInterval(Estado.chatbotWelcomeTimer);
        Estado.chatbotWelcomeTimer = null;
    }

    let revisiones = 0;
    Estado.chatbotWelcomeTimer = setInterval(() => {
        revisiones++;

        if (!Estado.modoChatbot) {
            clearInterval(Estado.chatbotWelcomeTimer);
            Estado.chatbotWelcomeTimer = null;
            return;
        }

        const lista = document.getElementById('lista-mensajes');
        const bienvenida = lista?.querySelector('[data-chatbot-welcome="1"]');

        if (!bienvenida) {
            renderizarBienvenidaChatbot();
        }

        if (bienvenida || revisiones >= intentos) {
            clearInterval(Estado.chatbotWelcomeTimer);
            Estado.chatbotWelcomeTimer = null;
        }
    }, 120);
}

function mostrarVista(id) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    const vista = document.getElementById(id);
    if (vista) vista.classList.add('activa');
}

function mostrarMensaje(elementoId, texto, tipo = 'error') {
    const el = document.getElementById(elementoId);
    if (el) {
        el.textContent = texto;
        el.className = `auth-mensaje ${tipo}`;
        setTimeout(() => { el.textContent = ''; el.className = 'auth-mensaje'; }, 5000);
    }
}

function toast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    div.className = `toast ${tipo}`;
    div.textContent = mensaje;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function formatearHora(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    const ahora = new Date();
    const hoy = ahora.toDateString() === d.toDateString();
    
    if (hoy) {
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
    
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    if (ayer.toDateString() === d.toDateString()) {
        return 'Ayer';
    }
    
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatearHoraMsg(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function obtenerInicial(nombre) {
    if (!nombre) return '?';
    return nombre.charAt(0).toUpperCase();
}

function generarColorAvatar(id) {
    const colores = [
        'linear-gradient(135deg, #4FC3F7, #0288D1)',
        'linear-gradient(135deg, #66BB6A, #2E7D32)',
        'linear-gradient(135deg, #FFA726, #E65100)',
        'linear-gradient(135deg, #AB47BC, #6A1B9A)',
        'linear-gradient(135deg, #EF5350, #B71C1C)',
        'linear-gradient(135deg, #26C6DA, #00838F)',
        'linear-gradient(135deg, #EC407A, #AD1457)',
        'linear-gradient(135deg, #7E57C2, #311B92)',
    ];
    return colores[(id || 0) % colores.length];
}

function formatearTamano(bytes) {
    bytes = Number(bytes || 0);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// AUTENTICACIÓN
// ============================================
async function hacerLogin() {
    const correo = document.getElementById('login-correo').value.trim();
    const contrasena = document.getElementById('login-contrasena').value;

    if (!correo || !contrasena) {
        mostrarMensaje('login-mensaje', 'Completa todos los campos');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=login`, {
        method: 'POST',
        body: JSON.stringify({ correo, contrasena })
    });

    if (res.exito) {
        Estado.usuario = res.usuario;
        iniciarChat();
    } else if (res.verificar) {
        Estado.correoVerificacion = correo;
        document.getElementById('verificacion-correo-text').textContent = correo;
        mostrarVista('vista-verificacion');
    } else {
        mostrarMensaje('login-mensaje', res.mensaje || res.error);
    }
}

// ============================================
// RECUPERAR CONTRASEÑA
// ============================================
let resetTokenLocal = null;

function mostrarRecuperarContrasena() {
    mostrarVista('vista-recuperar');
    document.getElementById('recuperar-paso1').style.display = '';
    document.getElementById('recuperar-paso2').style.display = 'none';
    const msgEl = document.getElementById('recuperar-mensaje');
    if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
    resetTokenLocal = null;
}

async function solicitarReset() {
    const correo = document.getElementById('recuperar-correo').value.trim();
    if (!correo) {
        mostrarRecuperarMsg('Ingresa tu correo electrónico', 'error');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=solicitar_reset`, {
        method: 'POST',
        body: JSON.stringify({ correo })
    });

    if (res.exito) {
        if (res.token) {
            // Modo local: tenemos token, mostrar paso 2
            resetTokenLocal = res.token;
            document.getElementById('recuperar-paso1').style.display = 'none';
            document.getElementById('recuperar-paso2').style.display = '';
            mostrarRecuperarMsg('Ingresa tu nueva contraseña', 'exito');
        } else {
            // Producción: se envió correo
            document.getElementById('recuperar-paso1').style.display = 'none';
            mostrarRecuperarMsg(res.mensaje || 'Revisa tu correo electrónico.', 'exito');
        }
    } else {
        mostrarRecuperarMsg(res.mensaje || 'Error al solicitar restablecimiento', 'error');
    }
}

async function resetearContrasena() {
    if (!resetTokenLocal) {
        mostrarRecuperarMsg('No se encontró el token', 'error');
        return;
    }

    const nueva = document.getElementById('recuperar-nueva').value;
    const confirmar = document.getElementById('recuperar-confirmar').value;

    if (!nueva || !confirmar) {
        mostrarRecuperarMsg('Completa todos los campos', 'error');
        return;
    }
    if (nueva !== confirmar) {
        mostrarRecuperarMsg('Las contraseñas no coinciden', 'error');
        return;
    }
    if (nueva.length < 6) {
        mostrarRecuperarMsg('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=reset_contrasena`, {
        method: 'POST',
        body: JSON.stringify({
            token: resetTokenLocal,
            contrasena: nueva,
            confirmar_contrasena: confirmar
        })
    });

    if (res.exito) {
        mostrarRecuperarMsg('¡Contraseña restablecida! Ahora puedes iniciar sesión.', 'exito');
        document.getElementById('recuperar-paso2').style.display = 'none';
        resetTokenLocal = null;
        setTimeout(() => mostrarVista('vista-login'), 2500);
    } else {
        mostrarRecuperarMsg(res.mensaje || 'Error al restablecer', 'error');
    }
}

function mostrarRecuperarMsg(texto, tipo) {
    const el = document.getElementById('recuperar-mensaje');
    if (el) {
        el.style.display = 'block';
        el.textContent = texto;
        el.style.color = tipo === 'exito' ? '#66bb6a' : '#ef5350';
    }
}

async function hacerRegistro() {
    const datos = {
        nombre: document.getElementById('reg-nombre').value.trim(),
        apellido_paterno: document.getElementById('reg-apellido-paterno').value.trim(),
        apellido_materno: document.getElementById('reg-apellido-materno').value.trim(),
        correo: document.getElementById('reg-correo').value.trim(),
        contrasena: document.getElementById('reg-contrasena').value,
        confirmar_contrasena: document.getElementById('reg-confirmar').value,
    };

    if (!datos.nombre || !datos.apellido_paterno || !datos.correo || !datos.contrasena) {
        mostrarMensaje('registro-mensaje', 'Completa los campos obligatorios (*)');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=registrar`, {
        method: 'POST',
        body: JSON.stringify(datos)
    });

    if (res.exito) {
        Estado.correoVerificacion = datos.correo;
        
        if (res.codigo_local) {
            // Modo local: mostrar código directamente
            toast(`Código de verificación: ${res.codigo_local}`, 'info');
        }
        
        document.getElementById('verificacion-correo-text').textContent = datos.correo;
        mostrarVista('vista-verificacion');
        mostrarMensaje('verificacion-mensaje', res.mensaje, 'exito');
    } else {
        mostrarMensaje('registro-mensaje', res.mensaje || res.error);
    }
}

async function verificarCodigo() {
    const inputs = document.querySelectorAll('.code-input');
    let codigo = '';
    inputs.forEach(i => codigo += i.value);

    if (codigo.length !== 6) {
        mostrarMensaje('verificacion-mensaje', 'Ingresa los 6 caracteres');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=verificar`, {
        method: 'POST',
        body: JSON.stringify({ correo: Estado.correoVerificacion, codigo })
    });

    if (res.exito) {
        toast('¡Correo verificado! Ya puedes iniciar sesión', 'exito');
        mostrarVista('vista-login');
        document.getElementById('login-correo').value = Estado.correoVerificacion;
    } else {
        mostrarMensaje('verificacion-mensaje', res.mensaje || res.error);
    }
}

async function reenviarCodigo() {
    const res = await fetchAPI(`${API.auth}?action=reenviar_codigo`, {
        method: 'POST',
        body: JSON.stringify({ correo: Estado.correoVerificacion })
    });

    if (res.exito) {
        mostrarMensaje('verificacion-mensaje', res.mensaje, 'exito');
        if (res.codigo_local) {
            toast(`Nuevo código: ${res.codigo_local}`, 'info');
        }
    } else {
        mostrarMensaje('verificacion-mensaje', res.mensaje || res.error);
    }
}

async function cerrarSesion() {
    await fetchAPI(`${API.auth}?action=logout`);
    clearInterval(Estado.pollTimer);
    clearInterval(Estado.refreshTimer);
    Estado.usuario = null;
    Estado.conversacionActual = null;
    mostrarVista('vista-login');
}

// Código de verificación - navegación entre inputs
function moverCodigo(input, index) {
    input.value = input.value.toUpperCase();
    if (input.value && index < 5) {
        document.querySelectorAll('.code-input')[index + 1].focus();
    }
}

function retrocederCodigo(e, index) {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
        document.querySelectorAll('.code-input')[index - 1].focus();
    }
}

// ============================================
// CHAT PRINCIPAL
// ============================================
function iniciarChat() {
    mostrarVista('vista-chat');
    
    // Configurar info del usuario
    document.getElementById('mi-nombre').textContent = Estado.usuario.nombre;
    renderAvatar(document.getElementById('mi-avatar'), Estado.usuario);

    // Cargar conversaciones
    cargarConversaciones();
    
    // Refrescar conversaciones cada 5 segundos
    Estado.refreshTimer = setInterval(cargarConversaciones, 5000);
}

async function cargarConversaciones() {
    const res = await fetchAPI(`${API.chat}?action=conversaciones`);
    
    if (Array.isArray(res)) {
        Estado.conversaciones = res;
        renderizarConversaciones();
    }
}

function renderizarConversaciones() {
    const lista = document.getElementById('lista-conversaciones');
    
    if (Estado.conversaciones.length === 0) {
        lista.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--texto-dark);">
                <p style="font-size:13px;">No tienes conversaciones aún</p>
                <p style="font-size:12px;margin-top:8px;">Busca un usuario para comenzar</p>
            </div>`;
        return;
    }

    lista.innerHTML = Estado.conversaciones.map(conv => {
        const activo = Estado.conversacionActual?.id == conv.id ? 'activo' : '';
        const nombre = conv.nombre_completo || conv.nombre_display || 'Chat';
        const hora = formatearHora(conv.ultima_fecha);
        const preview = conv.ultimo_mensaje || 'Sin mensajes';
        const noLeidos = conv.no_leidos > 0 ? `<span class="badge-count">${conv.no_leidos}</span>` : '';
        const online = conv.estado_conexion === 'conectado' ? '<div class="online-dot"></div>' : '';
        const avatarHtml = conv.avatar_display
            ? `<img src="${conv.avatar_display}" alt="${escapeHTML(nombre)}">`
            : `<span>${obtenerInicial(nombre)}</span>`;

        return `
        <div class="chat-item ${activo}" data-chat-id="${conv.id}" onclick="abrirConversacion(${conv.id}, '${escapeHTML(nombre)}', '${conv.estado_conexion || ''}', ${conv.otro_usuario_id || 0}, '${conv.avatar_display || ''}')">
            <div class="avatar-wrapper">
                <div class="avatar-sm" style="background:${generarColorAvatar(conv.otro_usuario_id || conv.id)}">${avatarHtml}</div>
                ${online}
            </div>
            <div class="chat-item-info">
                <div class="chat-item-top">
                    <span class="chat-item-name">${escapeHTML(nombre)}</span>
                    <span class="chat-item-time">${hora}</span>
                </div>
                <div class="chat-item-preview">
                    ${conv.ultimo_tipo_mensaje === 'imagen' ? '📷 Foto' : 
                      conv.ultimo_tipo_mensaje === 'documento' ? '📄 Documento' :
                      conv.ultimo_tipo_mensaje === 'audio' ? '🎤 Nota de voz' :
                      conv.ultimo_tipo_mensaje === 'chatbot' ? '🤖 Bot' : escapeHTML(preview)}
                    ${noLeidos}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function abrirConversacion(convId, nombre, estado, otroUserId, avatar = '') {
    Estado.modoChatbot = false;
    if (Estado.chatbotWelcomeTimer) { clearInterval(Estado.chatbotWelcomeTimer); Estado.chatbotWelcomeTimer = null; }
    if (Estado.pollTimer) clearInterval(Estado.pollTimer);
    const controller = nuevaSolicitudChat();
    const requestToken = ++Estado.chatRequestToken;
    Estado.conversacionActual = { id: convId, nombre, estado, otroUserId, avatar };
    Estado.mensajes = [];
    Estado.ultimoMensajeId = 0;

    // Quitar activo del chatbot entry
    document.querySelector('.chatbot-entry')?.classList.remove('activo');

    // Actualizar UI
    document.getElementById('chat-vacio').style.display = 'none';
    document.getElementById('chat-activo').style.display = 'flex';
    document.getElementById('chat-nombre').textContent = nombre;
    renderAvatar(document.getElementById('chat-avatar'), { nombre, id: otroUserId || convId, avatar });

    const estadoEl = document.getElementById('chat-estado');
    estadoEl.textContent = estado === 'conectado' ? 'En línea' : 'Desconectado';
    estadoEl.className = `chat-status ${estado}`;

    const listaMensajes = document.getElementById('lista-mensajes');
    if (listaMensajes) {
        listaMensajes.innerHTML = '<div class="message-date-separator"><span>Cargando chat...</span></div>';
    }

    // En móvil, ocultar sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('oculto');
    }

    // Marcar activo en lista
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('activo'));
    document.querySelector(`[data-chat-id=\"${convId}\"]`)?.classList.add('activo');

    // Cargar mensajes solo si esta sigue siendo la conversación activa
    await cargarMensajes(convId, requestToken, controller.signal);

    if (Estado.modoChatbot || Estado.conversacionActual?.id != convId || requestToken !== Estado.chatRequestToken) {
        return;
    }

    // Iniciar polling
    iniciarPolling();
}

async function cargarMensajes(convId, requestToken = Estado.chatRequestToken, signal = undefined) {
    const res = await fetchAPI(`${API.chat}?action=mensajes&conversacion_id=${convId}`, { signal });

    if (res?.aborted) return;

    if (requestToken !== Estado.chatRequestToken || Estado.modoChatbot || Estado.conversacionActual?.id != convId) {
        return;
    }

    if (Array.isArray(res)) {
        Estado.mensajes = res;
        Estado.ultimoMensajeId = res.length > 0 ? Math.max(...res.map(m => m.id)) : 0;
        renderizarMensajes();
    } else if (res.error) {
        toast(res.error, 'error');
    }
}

function renderizarMensajes() {
    if (Estado.modoChatbot) return;
    const lista = document.getElementById('lista-mensajes');
    let html = '';
    let fechaAnterior = '';

    Estado.mensajes.forEach(msg => {
        const fechaMsg = new Date(msg.fecha_envio).toLocaleDateString('es-MX', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        if (fechaMsg !== fechaAnterior) {
            html += `<div class="message-date-separator"><span>${fechaMsg}</span></div>`;
            fechaAnterior = fechaMsg;
        }

        const esBot = msg.tipo_mensaje === 'chatbot';
        const clase = msg.es_mio ? 'message-sent' : (esBot ? 'message-chatbot' : 'message-received');
        const deleteBtn = msg.es_mio ? `<button class="msg-delete" onclick="eliminarMensaje(${msg.id})" title="Eliminar">✕</button>` : '';
        
        let contenidoHTML = '';
        
        if (msg.tipo_mensaje === 'imagen' && msg.archivo_ruta) {
            contenidoHTML = `
                <div class="message-image">
                    <img src="${msg.archivo_ruta}" alt="Foto" onclick="window.open('${msg.archivo_ruta}', '_blank')">
                </div>`;
        } else if (msg.tipo_mensaje === 'audio' && msg.archivo_ruta) {
            contenidoHTML = `
                <div class="message-audio">
                    <audio controls preload="metadata" src="${escapeAttr(msg.archivo_ruta)}"></audio>
                    <div class="message-file-size">${msg.archivo_tamano ? formatearTamano(msg.archivo_tamano) : 'Nota de voz'}</div>
                </div>`;
        } else if (msg.tipo_mensaje === 'documento' && msg.archivo_ruta) {
            contenidoHTML = `
                <a href="${msg.archivo_ruta}" target="_blank" class="message-file" download>
                    <span class="message-file-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <div>
                        <div class="message-file-name">${escapeHTML(msg.archivo_nombre || 'Archivo')}</div>
                        ${msg.archivo_tamano ? `<div class="message-file-size">${formatearTamano(msg.archivo_tamano)}</div>` : ''}
                    </div>
                </a>`;
        }
        
        if (msg.contenido && !(msg.tipo_mensaje === 'audio' && msg.contenido === '🎤 Nota de voz')) {
            contenidoHTML += `<div class="message-text">${escapeHTML(msg.contenido)}</div>`;
        }

        html += `
        <div class="message-bubble ${clase}" data-id="${msg.id}">
            ${deleteBtn}
            ${!msg.es_mio && !esBot ? `<div class="message-sender">${escapeHTML(msg.remitente_nombre || '')}</div>` : ''}
            ${contenidoHTML}
            <div class="message-meta">
                <span class="message-time">${formatearHoraMsg(msg.fecha_envio)}</span>
                ${msg.es_mio ? `<span class="message-check">${msg.leido ? '✓✓' : '✓'}</span>` : ''}
            </div>
        </div>`;
    });

    lista.innerHTML = html;
    scrollAlFinal();
}

function scrollAlFinal() {
    const container = document.getElementById('contenedor-mensajes');
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

// ============================================
// ENVIAR MENSAJES
// ============================================
async function enviarMensaje() {
    // Si estamos en modo chatbot, enviar al bot
    if (Estado.modoChatbot) {
        return enviarMensajeBot();
    }
    
    const input = document.getElementById('input-mensaje');
    const contenido = input.value.trim();
    
    if (!contenido || !Estado.conversacionActual) return;
    
    input.value = '';

    // Agregar mensaje optimistamente
    const msgTemp = {
        id: Date.now(),
        remitente_id: Estado.usuario.id,
        contenido: contenido,
        tipo_mensaje: 'texto',
        es_mio: true,
        fecha_envio: new Date().toISOString(),
        leido: false,
        remitente_nombre: Estado.usuario.nombre
    };
    Estado.mensajes.push(msgTemp);
    renderizarMensajes();

    const res = await fetchAPI(`${API.chat}?action=enviar`, {
        method: 'POST',
        body: JSON.stringify({
            conversacion_id: Estado.conversacionActual.id,
            contenido: contenido,
            tipo: 'texto'
        })
    });

    if (res.exito) {
        // Actualizar ID real
        const idx = Estado.mensajes.findIndex(m => m.id === msgTemp.id);
        if (idx !== -1) {
            Estado.mensajes[idx].id = res.mensaje_id;
            Estado.ultimoMensajeId = Math.max(Estado.ultimoMensajeId, res.mensaje_id);
        }
    } else {
        toast(res.error || 'Error al enviar', 'error');
    }
}

async function enviarArchivo(inputFile) {
    if (!inputFile.files.length || !Estado.conversacionActual) return;
    await enviarArchivoDirecto(inputFile.files[0]);
    inputFile.value = '';
}

async function enviarArchivoDirecto(file, tipoForzado = null, contenido = '') {
    if (!file || !Estado.conversacionActual) return;

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('conversacion_id', Estado.conversacionActual.id);

    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const mime = file.type || '';
    const esImagen = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
    const esAudio = mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'].includes(extension);
    const tipo = tipoForzado || (esImagen ? 'imagen' : (esAudio ? 'audio' : 'documento'));

    formData.append('tipo', tipo);
    formData.append('contenido', contenido || (tipo === 'audio' ? '🎤 Nota de voz' : file.name));

    toast(tipo === 'audio' ? 'Enviando nota de voz...' : 'Enviando archivo...', 'info');

    try {
        const res = await fetch(`${API.chat}?action=enviar`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.exito) {
            toast(tipo === 'audio' ? 'Nota de voz enviada' : 'Archivo enviado', 'exito');
            await cargarMensajes(Estado.conversacionActual.id);
            await cargarConversaciones();
        } else {
            toast(data.error || 'Error al enviar archivo', 'error');
        }
    } catch (e) {
        console.error(e);
        toast('Error al subir archivo', 'error');
    }
}

async function toggleGrabacionAudio() {
    if (Estado.grabandoAudio) {
        await detenerGrabacionAudio();
        return;
    }

    if (!Estado.conversacionActual) {
        toast('Abre una conversación primero', 'info');
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('Tu navegador no soporta notas de voz', 'error');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1
            }
        });

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('AudioContext no soportado');
        }

        const audioContext = new AudioContextClass();
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        Estado.audioStream = stream;
        Estado.audioContext = audioContext;
        Estado.audioProcessor = processor;
        Estado.audioSource = source;
        Estado.audioSampleRate = audioContext.sampleRate || 44100;
        Estado.audioBufferChunks = [];

        processor.onaudioprocess = (event) => {
            if (!Estado.grabandoAudio) return;
            const input = event.inputBuffer.getChannelData(0);
            Estado.audioBufferChunks.push(new Float32Array(input));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        Estado.grabandoAudio = true;
        actualizarUIGrabacion(true);
        toast('Grabando nota de voz... toca el micrófono otra vez para enviar', 'info');
    } catch (error) {
        console.error(error);
        await limpiarGrabacionAudio();
        toast('No pude abrir el micrófono. Revisa permisos del navegador.', 'error');
    }
}

async function detenerGrabacionAudio() {
    if (!Estado.grabandoAudio) return;

    Estado.grabandoAudio = false;
    actualizarUIGrabacion(false);

    try {
        const wavBlob = convertirBuffersAWav(Estado.audioBufferChunks, Estado.audioSampleRate);
        await limpiarGrabacionAudio();

        if (wavBlob && wavBlob.size > 44) {
            const file = new File([wavBlob], `nota-voz-${Date.now()}.wav`, { type: 'audio/wav' });
            await enviarArchivoDirecto(file, 'audio', '🎤 Nota de voz');
        } else {
            toast('No se pudo capturar audio. Intenta hablar más cerca del micrófono.', 'error');
        }
    } catch (error) {
        console.error(error);
        await limpiarGrabacionAudio();
        toast('No se pudo procesar la nota de voz', 'error');
    }
}

async function limpiarGrabacionAudio() {
    try {
        if (Estado.audioProcessor) {
            Estado.audioProcessor.disconnect();
            Estado.audioProcessor.onaudioprocess = null;
        }
        if (Estado.audioSource) {
            Estado.audioSource.disconnect();
        }
        if (Estado.audioStream) {
            Estado.audioStream.getTracks().forEach(track => track.stop());
        }
        if (Estado.audioContext) {
            await Estado.audioContext.close();
        }
    } catch (e) {
        console.error(e);
    }

    Estado.mediaRecorder = null;
    Estado.audioChunks = [];
    Estado.audioStream = null;
    Estado.audioContext = null;
    Estado.audioProcessor = null;
    Estado.audioSource = null;
    Estado.audioBufferChunks = [];
}

function convertirBuffersAWav(buffers, sampleRate) {
    if (!buffers || !buffers.length) {
        return new Blob([], { type: 'audio/wav' });
    }

    let totalLength = 0;
    for (const chunk of buffers) totalLength += chunk.length;

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of buffers) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    const wavBuffer = codificarWavMono(merged, sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function codificarWavMono(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    escribirTextoWav(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    escribirTextoWav(view, 8, 'WAVE');
    escribirTextoWav(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    escribirTextoWav(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
}

function escribirTextoWav(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
    }
}

function actualizarUIGrabacion(activa) {
    const barra = document.getElementById('audio-recording-bar');
    const boton = document.getElementById('btn-audio');
    if (barra) barra.style.display = activa ? 'flex' : 'none';
    if (boton) boton.classList.toggle('recording', activa);
}

async function eliminarMensaje(id) {
    if (!confirm('¿Eliminar este mensaje?')) return;

    const res = await fetchAPI(`${API.chat}?action=eliminar_mensaje`, {
        method: 'POST',
        body: JSON.stringify({ mensaje_id: id })
    });

    if (res.exito) {
        Estado.mensajes = Estado.mensajes.filter(m => m.id !== id);
        renderizarMensajes();
        toast('Mensaje eliminado', 'exito');
    } else {
        toast(res.error || 'Error', 'error');
    }
}

// ============================================
// POLLING (MENSAJES NUEVOS)
// ============================================
function iniciarPolling() {
    if (Estado.pollTimer) clearInterval(Estado.pollTimer);

    const convId = Estado.conversacionActual?.id ?? null;
    const requestToken = Estado.chatRequestToken;

    if (!convId || Estado.modoChatbot) return;
    
    Estado.pollTimer = setInterval(async () => {
        if (!Estado.conversacionActual || Estado.modoChatbot) return;
        if (Estado.conversacionActual.id != convId) return;
        if (requestToken !== Estado.chatRequestToken) return;
        
        try {
            const pollController = new AbortController();
            const res = await fetchAPI(
                `${API.chat}?action=mensajes&conversacion_id=${convId}`,
                { signal: pollController.signal }
            );

            if (res?.aborted || Estado.modoChatbot) return;
            if (!Estado.conversacionActual || Estado.conversacionActual.id != convId) return;
            if (requestToken !== Estado.chatRequestToken) return;
            
            if (Array.isArray(res)) {
                const currentLastId = Estado.mensajes.length > 0 ? Math.max(...Estado.mensajes.map(m => m.id)) : 0;
                const nextLastId = res.length > 0 ? Math.max(...res.map(m => m.id)) : 0;

                if (nextLastId !== currentLastId || res.length !== Estado.mensajes.length) {
                    Estado.mensajes = res;
                    Estado.ultimoMensajeId = nextLastId;
                    renderizarMensajes();
                }
            }
        } catch (e) { /* silenciar */ }
    }, 3000);
}

// ============================================
// BÚSQUEDA
// ============================================
let busquedaTimer = null;

function buscarChats(termino) {
    clearTimeout(busquedaTimer);

    if (termino.length < 2) {
        document.getElementById('resultados-busqueda').style.display = 'none';
        document.getElementById('lista-conversaciones').style.display = 'block';
        return;
    }

    busquedaTimer = setTimeout(async () => {
        const res = await fetchAPI(`${API.chat}?action=buscar_usuarios&q=${encodeURIComponent(termino)}`);
        
        if (Array.isArray(res) && res.length > 0) {
            document.getElementById('resultados-busqueda').style.display = 'block';
            document.getElementById('lista-conversaciones').style.display = 'none';

            const listaHTML = res.map(u => {
                const nombre = `${u.nombre} ${u.apellido_paterno}${u.apellido_materno ? ' ' + u.apellido_materno : ''}`;
                const color = generarColorAvatar(u.id);
                return `
                <div class="user-result" onclick="iniciarChatConUsuario(${u.id}, '${escapeHTML(nombre)}')">
                    <div class="avatar-sm" style="background:${color}"><span>${obtenerInicial(u.nombre)}</span></div>
                    <div class="user-result-info">
                        <div class="user-result-name">${escapeHTML(nombre)}</div>
                        <div class="user-result-email">${escapeHTML(u.correo)}</div>
                    </div>
                </div>`;
            }).join('');

            document.getElementById('lista-usuarios-busqueda').innerHTML = listaHTML;
        } else {
            document.getElementById('resultados-busqueda').style.display = 'block';
            document.getElementById('lista-usuarios-busqueda').innerHTML = 
                '<p style="color:var(--texto-dark);font-size:13px;padding:8px;">No se encontraron usuarios</p>';
        }
    }, 300);
}

async function iniciarChatConUsuario(otroId, nombre) {
    const res = await fetchAPI(`${API.chat}?action=nueva_conversacion`, {
        method: 'POST',
        body: JSON.stringify({ otro_usuario_id: otroId })
    });

    if (res.exito || res.conversacion_id) {
        document.getElementById('buscar-chat').value = '';
        document.getElementById('resultados-busqueda').style.display = 'none';
        document.getElementById('lista-conversaciones').style.display = 'block';
        
        await cargarConversaciones();
        abrirConversacion(res.conversacion_id, nombre, '', otroId);
    } else {
        toast(res.error || 'Error al crear chat', 'error');
    }
}

function cerrarChat() {
    Estado.conversacionActual = null;
    Estado.modoChatbot = false;
    if (Estado.chatbotWelcomeTimer) { clearInterval(Estado.chatbotWelcomeTimer); Estado.chatbotWelcomeTimer = null; }
    abortarSolicitudesChat();
    if (Estado.pollTimer) clearInterval(Estado.pollTimer);
    document.getElementById('chat-activo').style.display = 'none';
    document.getElementById('chat-vacio').style.display = 'flex';
    document.querySelector('.chatbot-entry')?.classList.remove('activo');
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('oculto');
    }
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('activo'));
}

// ============================================
// EMOJIS
// ============================================
const EMOJIS = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
    '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
    '😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡',
    '🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬',
    '😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
    '🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸',
    '😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲',
    '😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭',
    '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡',
    '😠','🤬','👋','🤚','🖐','✋','🖖','🫱','🫲','👌',
    '🤌','🤏','✌','🤞','🫰','🤟','🤘','🤙','👈','👉',
    '👆','🖕','👇','☝','🫵','👍','👎','✊','👊','🤛',
    '🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍','💪',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','💥',
    '💫','⭐','🌟','✨','💤','🔥','💀','👻','👽','🤖',
    '💩','🎉','🎊','🎈','🎁','🏆','⚽','🏀','🎮','🎵',
];

function toggleEmojis() {
    const picker = document.getElementById('emoji-picker');
    if (picker.style.display === 'none') {
        if (!document.getElementById('emoji-grid').children.length) {
            const grid = document.getElementById('emoji-grid');
            grid.innerHTML = EMOJIS.map(e => 
                `<button class="emoji-btn" onclick="insertarEmoji('${e}')">${e}</button>`
            ).join('');
        }
        picker.style.display = 'block';
    } else {
        picker.style.display = 'none';
    }
}

function insertarEmoji(emoji) {
    const input = document.getElementById('input-mensaje');
    input.value += emoji;
    input.focus();
}

// ============================================
// CHATBOT
// ============================================
async function iniciarChatbot() {
    const input = document.getElementById('input-mensaje');
    const mensaje = input.value.trim();
    
    if (!mensaje) {
        toast('Escribe un mensaje para el chatbot', 'info');
        return;
    }

    if (!Estado.conversacionActual) return;

    // Enviar mensaje del usuario primero
    await enviarMensaje();

    // Mostrar indicador de escritura
    const lista = document.getElementById('lista-mensajes');
    const typingHTML = `
        <div class="message-bubble message-chatbot" id="typing-indicator">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>`;
    lista.insertAdjacentHTML('beforeend', typingHTML);
    scrollAlFinal();

    // Enviar al chatbot
    const res = await fetchAPI(`${API.chat}?action=chatbot`, {
        method: 'POST',
        body: JSON.stringify({
            conversacion_id: Estado.conversacionActual.id,
            mensaje: mensaje
        })
    });

    // Quitar indicador
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();

    if (res.error) {
        toast(res.error, 'error');
        return;
    }

    if (res.exito) {
        // Recargar mensajes para ver la respuesta del bot
        await cargarMensajes(Estado.conversacionActual.id);
    }
}

// ============================================
// CONFIG CHATBOT
// ============================================
function toggleConfigBot() {
    // 🔒 Configuración por UI deshabilitada (la IA se configura en config.php / variables de entorno)
    toast('La configuración del bot ahora es global (config.php).', 'info');
}

async function cargarConfigBot() {
    return;
}

function actualizarModeloSugerido() {
    const providerEl = document.getElementById('config-provider');
    const modeloInput = document.getElementById('config-modelo');
    const sugerencia = document.getElementById('modelo-sugerencia');

    if (!providerEl || !modeloInput) return;
    const provider = providerEl.value;
    
    const modelos = {
        gemini: { placeholder: 'gemini-2.0-flash', sugerencia: 'Modelos: gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-pro' },
        openai: { placeholder: 'gpt-3.5-turbo', sugerencia: 'Modelos: gpt-4o, gpt-4o-mini, gpt-3.5-turbo' },
        anthropic: { placeholder: 'claude-sonnet-4-5-20250929', sugerencia: 'Modelos: claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001' }
    };
    
    const config = modelos[provider] || modelos.gemini;
    modeloInput.placeholder = config.placeholder;
    if (sugerencia) sugerencia.textContent = config.sugerencia;
    
    // Si el campo está vacío o tiene un modelo de otro provider, actualizarlo
    const todosModelos = Object.values(modelos).map(m => m.placeholder);
    if (!modeloInput.value || todosModelos.includes(modeloInput.value)) {
        modeloInput.value = config.placeholder;
    }
}

async function guardarConfigBot() {
    toast('La configuración del bot se hace en config.php.', 'info');
}

// ============================================
// CHATBOT STANDALONE (tipo Meta AI)
// ============================================

// Persistencia del historial del chatbot en localStorage
function guardarChatbotHistorial() {
    try {
        const datos = {
            historial: Estado.chatbotHistorial,
            timestamp: Date.now()
        };
        localStorage.setItem('chucho_chatbot_historial', JSON.stringify(datos));
    } catch (e) { /* localStorage lleno o no disponible */ }
}

function cargarChatbotHistorial() {
    try {
        const raw = localStorage.getItem('chucho_chatbot_historial');
        if (!raw) return [];
        const datos = JSON.parse(raw);
        // Expirar historial después de 24 horas
        if (Date.now() - (datos.timestamp || 0) > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('chucho_chatbot_historial');
            return [];
        }
        return Array.isArray(datos.historial) ? datos.historial : [];
    } catch (e) { return []; }
}

function renderizarHistorialChatbot(lista) {
    let html = '<div class="message-date-separator"><span>Hoy</span></div>';
    html += `<div class="message-bubble message-chatbot" data-chatbot-welcome="1">
        <div class="message-text">¡Hola! 👋 Soy <strong>Chucho Bot</strong>, tu asistente con IA. Pregúntame lo que quieras y te ayudaré.</div>
        <div class="message-meta">
            <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
        </div>
    </div>`;

    for (const msg of Estado.chatbotHistorial) {
        if (msg.role === 'user') {
            html += `<div class="message-bubble message-sent">
                <div class="message-text">${escapeHTML(msg.content)}</div>
                <div class="message-meta">
                    <span class="message-time">${msg.time || ''}</span>
                    <span class="message-check">✓</span>
                </div>
            </div>`;
        } else {
            let textoFormateado = escapeHTML(msg.content)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;">$1</code>')
                .replace(/\n/g, '<br>');
            html += `<div class="message-bubble message-chatbot">
                <div class="message-text">${textoFormateado}</div>
                <div class="message-meta">
                    <span class="message-time">${msg.time || ''}</span>
                </div>
            </div>`;
        }
    }
    lista.innerHTML = html;
}

function abrirChatBot() {
    Estado.modoChatbot = true;
    Estado.conversacionActual = null;
    Estado.chatRequestToken++;
    Estado.mensajes = [];
    Estado.ultimoMensajeId = 0;

    abortarSolicitudesChat();
    if (Estado.pollTimer) clearInterval(Estado.pollTimer);
    if (Estado.chatbotWelcomeTimer) { clearInterval(Estado.chatbotWelcomeTimer); Estado.chatbotWelcomeTimer = null; }

    // Restaurar historial guardado o empezar limpio
    const historialGuardado = cargarChatbotHistorial();
    Estado.chatbotHistorial = historialGuardado;

    const lista = document.getElementById('lista-mensajes');
    if (lista) {
        if (historialGuardado.length > 0) {
            renderizarHistorialChatbot(lista);
        } else {
            lista.innerHTML = `
                <div class="message-date-separator"><span>Hoy</span></div>
                <div class="message-bubble message-chatbot" data-chatbot-welcome="1">
                    <div class="message-text">¡Hola! 👋 Soy <strong>Chucho Bot</strong>, tu asistente con IA. Pregúntame lo que quieras y te ayudaré.</div>
                    <div class="message-meta">
                        <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                </div>`;
        }
    }

    const input = document.getElementById('input-mensaje');
    if (input) input.value = '';

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('activo'));
    document.querySelector('.chatbot-entry')?.classList.add('activo');

    document.getElementById('chat-vacio').style.display = 'none';
    document.getElementById('chat-activo').style.display = 'flex';
    document.getElementById('chat-nombre').textContent = 'Chucho Bot IA';
    renderAvatar(document.getElementById('chat-avatar'), { nombre: 'Chucho Bot IA', id: 999999 });
    const estadoEl = document.getElementById('chat-estado');
    estadoEl.textContent = 'Siempre disponible';
    estadoEl.className = 'chat-status conectado';

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('oculto');
    }

    // Reafirmar la bienvenida por si una carga vieja intentó tocar el DOM.
    setTimeout(() => {
        if (!Estado.modoChatbot) return;
        const lista2 = document.getElementById('lista-mensajes');
        if (!lista2?.querySelector('[data-chatbot-welcome="1"]')) {
            if (Estado.chatbotHistorial.length > 0) {
                renderizarHistorialChatbot(lista2);
            } else {
                lista2.innerHTML = `
                    <div class="message-date-separator"><span>Hoy</span></div>
                    <div class="message-bubble message-chatbot" data-chatbot-welcome="1">
                        <div class="message-text">¡Hola! 👋 Soy <strong>Chucho Bot</strong>, tu asistente con IA. Pregúntame lo que quieras y te ayudaré.</div>
                        <div class="message-meta">
                            <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                    </div>`;
            }
        }
        scrollAlFinal();
    }, 50);
}

async function enviarMensajeBot() {
    const input = document.getElementById('input-mensaje');
    const contenido = input.value.trim();
    if (!contenido) return;
    
    input.value = '';
    
    // Mostrar mensaje del usuario
    const lista = document.getElementById('lista-mensajes');
    lista.insertAdjacentHTML('beforeend', `
        <div class="message-bubble message-sent">
            <div class="message-text">${escapeHTML(contenido)}</div>
            <div class="message-meta">
                <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
                <span class="message-check">✓</span>
            </div>
        </div>`);
    
    // Indicador de escritura
    lista.insertAdjacentHTML('beforeend', `
        <div class="message-bubble message-chatbot" id="bot-typing">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>`);
    scrollAlFinal();
    
    // Agregar al historial con hora
    const horaActual = new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'});
    Estado.chatbotHistorial.push({ role: 'user', content: contenido, time: horaActual });
    guardarChatbotHistorial();

    // Llamar API - enviar últimos 20 mensajes de contexto para conversaciones más largas
    const res = await fetchAPI(`${API.chat}?action=chatbot_directo`, {
        method: 'POST',
        body: JSON.stringify({
            mensaje: contenido,
            historial: Estado.chatbotHistorial.slice(-20)
        })
    });

    // Quitar typing
    document.getElementById('bot-typing')?.remove();

    if (res.error) {
        lista.insertAdjacentHTML('beforeend', `
            <div class="message-bubble message-chatbot">
                <div class="message-text" style="color:var(--error);">⚠️ ${escapeHTML(res.error)}</div>
                <div class="message-meta">
                    <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
            </div>`);
    } else if (res.exito) {
        const horaBot = new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'});
        Estado.chatbotHistorial.push({ role: 'assistant', content: res.contenido, time: horaBot });
        guardarChatbotHistorial();
        
        // Formatear respuesta (soportar markdown básico)
        let textoFormateado = escapeHTML(res.contenido)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;">$1</code>')
            .replace(/\n/g, '<br>');
        
        lista.insertAdjacentHTML('beforeend', `
            <div class="message-bubble message-chatbot">
                <div class="message-text">${textoFormateado}</div>
                <div class="message-meta">
                    <span class="message-time">${new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
            </div>`);
    }
    
    scrollAlFinal();
}

// ============================================
// USUARIOS REGISTRADOS
// ============================================
async function toggleUsuariosRegistrados() {
    const modal = document.getElementById('modal-usuarios');
    if (modal.style.display === 'none') {
        modal.style.display = 'flex';
        await cargarTodosUsuarios();
    } else {
        modal.style.display = 'none';
    }
}

async function cargarTodosUsuarios() {
    const res = await fetchAPI(`${API.chat}?action=todos_usuarios`);
    
    if (Array.isArray(res)) {
        Estado.todosUsuarios = res;
        renderizarListaUsuarios(res);
    } else {
        document.getElementById('lista-todos-usuarios').innerHTML = 
            '<p style="text-align:center;padding:30px;color:var(--texto-dark);font-size:13px;">Error al cargar usuarios</p>';
    }
}

function renderizarListaUsuarios(usuarios) {
    const lista = document.getElementById('lista-todos-usuarios');
    
    if (usuarios.length === 0) {
        lista.innerHTML = '<p style="text-align:center;padding:30px;color:var(--texto-dark);font-size:13px;">No hay otros usuarios registrados</p>';
        return;
    }
    
    lista.innerHTML = usuarios.map(u => {
        const nombre = `${u.nombre} ${u.apellido_paterno}${u.apellido_materno ? ' ' + u.apellido_materno : ''}`;
        const color = generarColorAvatar(u.id);
        const online = u.estado_conexion === 'conectado';
        
        return `
        <div class="usuario-item">
            <div class="avatar-wrapper">
                <div class="avatar-sm" style="background:${color}"><span>${obtenerInicial(u.nombre)}</span></div>
                ${online ? '<div class="online-dot"></div>' : ''}
            </div>
            <div class="usuario-item-info">
                <div class="usuario-item-name">${escapeHTML(nombre)}</div>
                <div class="usuario-item-email">${escapeHTML(u.correo)}</div>
            </div>
            <div class="usuario-item-status ${u.estado_conexion || ''}"></div>
            <button class="btn-chat-sm" onclick="iniciarChatDesdeModal(${u.id}, '${escapeHTML(nombre)}')">Chatear</button>
        </div>`;
    }).join('');
}

function filtrarUsuariosLista(termino) {
    if (!termino) {
        renderizarListaUsuarios(Estado.todosUsuarios);
        return;
    }
    const filtrados = Estado.todosUsuarios.filter(u => {
        const nombre = `${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ''} ${u.correo}`.toLowerCase();
        return nombre.includes(termino.toLowerCase());
    });
    renderizarListaUsuarios(filtrados);
}

async function iniciarChatDesdeModal(otroId, nombre) {
    document.getElementById('modal-usuarios').style.display = 'none';
    
    const res = await fetchAPI(`${API.chat}?action=nueva_conversacion`, {
        method: 'POST',
        body: JSON.stringify({ otro_usuario_id: otroId })
    });
    
    if (res.exito || res.conversacion_id) {
        await cargarConversaciones();
        Estado.modoChatbot = false;
        document.querySelector('.chatbot-entry')?.classList.remove('activo');
        abrirConversacion(res.conversacion_id, nombre, '', otroId);
        toast(`Chat con ${nombre} iniciado`, 'exito');
    } else {
        toast(res.error || 'Error al crear chat', 'error');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si hay sesión activa
    const res = await fetchAPI(`${API.auth}?action=sesion`);
    
    if (res.autenticado && res.usuario) {
        Estado.usuario = res.usuario;
        iniciarChat();
    } else {
        mostrarVista('vista-login');
    }

    // Enter en login
    document.getElementById('login-contrasena')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') hacerLogin();
    });

    // Cerrar emoji picker al hacer click fuera
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emoji-picker');
        if (picker?.style.display === 'block' && 
            !e.target.closest('.emoji-picker') && 
            !e.target.closest('[title="Emojis"]')) {
            picker.style.display = 'none';
        }
    });

    // 📱 Fix móvil: asegurar que el input quede visible cuando aparece el teclado
    const inputMensaje = document.getElementById('input-mensaje');
    inputMensaje?.addEventListener('focus', () => {
        setTimeout(() => {
            inputMensaje.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
    });
});


let perfilCameraStream = null;

function renderAvatar(elemento, usuario = {}) {
    if (!elemento) return;
    const nombre = usuario.nombre || usuario.nombre_completo || usuario.nombre_display || '';
    const id = usuario.id || usuario.otro_usuario_id || 0;
    const avatar = usuario.avatar || usuario.avatar_display || '';
    elemento.style.background = generarColorAvatar(id);
    if (avatar) {
        elemento.innerHTML = `<img src="${avatar}" alt="${escapeHTML(nombre || 'Avatar')}">`;
    } else {
        elemento.innerHTML = `<span>${obtenerInicial(nombre)}</span>`;
    }
}

async function abrirPerfil() {
    const modal = document.getElementById('modal-perfil');
    modal.style.display = 'flex';

    const res = await fetchAPI(`${API.auth}?action=perfil`);
    if (!res.exito || !res.usuario) {
        toast(res.mensaje || res.error || 'No pude cargar el perfil', 'error');
        return;
    }

    const u = res.usuario;
    document.getElementById('perfil-nombre').value = u.nombre || '';
    document.getElementById('perfil-apellido-paterno').value = u.apellido_paterno || '';
    document.getElementById('perfil-apellido-materno').value = u.apellido_materno || '';
    document.getElementById('perfil-username').value = u.username || '';
    document.getElementById('perfil-correo').value = u.correo || '';
    document.getElementById('perfil-telefono').value = u.telefono || '';
    renderAvatar(document.getElementById('perfil-avatar-preview'), { ...u, nombre: `${u.nombre || ''} ${u.apellido_paterno || ''}`.trim() });
}

function cerrarPerfil() {
    cerrarCamaraPerfil();
    document.getElementById('modal-perfil').style.display = 'none';
}

async function guardarPerfil() {
    const payload = {
        nombre: document.getElementById('perfil-nombre').value.trim(),
        apellido_paterno: document.getElementById('perfil-apellido-paterno').value.trim(),
        apellido_materno: document.getElementById('perfil-apellido-materno').value.trim(),
        username: document.getElementById('perfil-username').value.trim(),
        correo: document.getElementById('perfil-correo').value.trim(),
        telefono: document.getElementById('perfil-telefono').value.trim(),
    };

    const res = await fetchAPI(`${API.auth}?action=actualizar_perfil`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!res.exito) {
        toast(res.mensaje || res.error || 'No se pudo actualizar el perfil', 'error');
        return;
    }

    Estado.usuario = { ...Estado.usuario, ...res.usuario };
    document.getElementById('mi-nombre').textContent = Estado.usuario.nombre;
    renderAvatar(document.getElementById('mi-avatar'), Estado.usuario);
    renderAvatar(document.getElementById('perfil-avatar-preview'), Estado.usuario);
    toast(res.mensaje || 'Perfil actualizado', 'exito');
}

async function cambiarPasswordPerfil() {
    const payload = {
        contrasena_actual: document.getElementById('perfil-pass-actual').value,
        contrasena_nueva: document.getElementById('perfil-pass-nueva').value,
        confirmar_contrasena: document.getElementById('perfil-pass-confirmar').value,
    };

    if (payload.contrasena_actual && payload.contrasena_actual === payload.contrasena_nueva) {
        toast('La nueva contraseña debe ser diferente a la actual', 'error');
        return;
    }

    const res = await fetchAPI(`${API.auth}?action=cambiar_contrasena`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!res.exito) {
        toast(res.mensaje || res.error || 'No se pudo cambiar la contraseña', 'error');
        return;
    }

    document.getElementById('perfil-pass-actual').value = '';
    document.getElementById('perfil-pass-nueva').value = '';
    document.getElementById('perfil-pass-confirmar').value = '';
    toast(res.mensaje || 'Contraseña actualizada', 'exito');
}

async function abrirCamaraPerfil() {
    const cameraBox = document.getElementById('camera-box');
    const video = document.getElementById('perfil-camera-video');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('Tu navegador no permite abrir la cámara directamente', 'error');
        return;
    }

    try {
        perfilCameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });

        video.srcObject = perfilCameraStream;
        cameraBox.style.display = 'block';
    } catch (error) {
        console.error(error);
        toast('No se pudo abrir la cámara. Revisa permisos del navegador.', 'error');
    }
}

function cerrarCamaraPerfil() {
    const cameraBox = document.getElementById('camera-box');
    const video = document.getElementById('perfil-camera-video');

    if (perfilCameraStream) {
        perfilCameraStream.getTracks().forEach(track => track.stop());
        perfilCameraStream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    if (cameraBox) {
        cameraBox.style.display = 'none';
    }
}

async function capturarFotoPerfil() {
    const video = document.getElementById('perfil-camera-video');
    const canvas = document.getElementById('perfil-camera-canvas');

    if (!video || !canvas || !video.videoWidth) {
        toast('La cámara aún no está lista', 'error');
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));

    if (!blob) {
        toast('No se pudo capturar la foto', 'error');
        return;
    }

    const file = new File([blob], 'avatar-camera.jpg', { type: 'image/jpeg' });
    await subirAvatarArchivo(file);
    cerrarCamaraPerfil();
}

async function subirAvatarArchivo(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const res = await fetch(`${API.auth}?action=subir_avatar`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (!data.exito) {
            toast(data.mensaje || data.error || 'No se pudo subir la foto', 'error');
            return;
        }

        Estado.usuario = { ...Estado.usuario, avatar: data.avatar };
        renderAvatar(document.getElementById('mi-avatar'), Estado.usuario);
        renderAvatar(document.getElementById('perfil-avatar-preview'), Estado.usuario);
        toast(data.mensaje || 'Foto actualizada', 'exito');
        await cargarConversaciones();
    } catch (e) {
        console.error(e);
        toast('Error al subir la foto', 'error');
    }
}

async function subirAvatarPerfil(input) {
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    await subirAvatarArchivo(file);
    input.value = '';
}

// ============================================
// RECONOCIMIENTO FACIAL (face-api.js)
// ============================================

const FaceState = {
    modelsLoaded: false,
    loginStream: null,
    registerStream: null,
    loginDetecting: false,
    registerDetecting: false,
};

const FACE_MODELS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

async function cargarModelosFaciales() {
    if (FaceState.modelsLoaded) return true;
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
        ]);
        FaceState.modelsLoaded = true;
        return true;
    } catch (e) {
        console.error('Error cargando modelos faciales:', e);
        return false;
    }
}

async function iniciarCamara(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        videoElement.srcObject = stream;
        await new Promise(resolve => { videoElement.onloadedmetadata = resolve; });
        return stream;
    } catch (e) {
        console.error('Error accediendo a la cámara:', e);
        toast('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
        return null;
    }
}

function detenerCamara(stream) {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
    }
}

async function detectarCara(videoElement) {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const detection = await faceapi.detectSingleFace(videoElement, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();
    return detection || null;
}

// -------- LOGIN FACIAL --------

async function iniciarLoginFacial() {
    const modal = document.getElementById('face-login-modal');
    const status = document.getElementById('face-login-status');
    const video = document.getElementById('face-login-video');
    const overlay = document.getElementById('face-login-overlay');

    modal.style.display = 'flex';
    status.textContent = 'Cargando modelos de inteligencia artificial...';
    overlay.className = 'face-overlay';

    const loaded = await cargarModelosFaciales();
    if (!loaded) {
        status.textContent = 'Error al cargar los modelos. Intenta de nuevo.';
        return;
    }

    status.textContent = 'Iniciando cámara...';
    FaceState.loginStream = await iniciarCamara(video);
    if (!FaceState.loginStream) {
        status.textContent = 'No se pudo acceder a la cámara.';
        return;
    }

    status.textContent = 'Coloca tu cara dentro del óvalo...';
    overlay.className = 'face-overlay scanning';
    FaceState.loginDetecting = true;

    detectarCicloLogin(video, overlay, status);
}

async function detectarCicloLogin(video, overlay, status) {
    if (!FaceState.loginDetecting) return;

    const detection = await detectarCara(video);

    if (detection) {
        overlay.className = 'face-overlay detected';
        status.textContent = 'Rostro detectado. Verificando identidad...';

        const descriptor = Array.from(detection.descriptor);

        try {
            const res = await fetch(`${API.auth}?action=login_cara`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor })
            });
            const data = await res.json();

            if (data.exito) {
                status.textContent = `¡Bienvenido ${data.usuario.nombre}! (${data.confianza}% de confianza)`;
                toast(`Inicio de sesión facial exitoso`, 'exito');
                cerrarLoginFacial();
                setTimeout(() => {
                    Estado.usuario = data.usuario;
                    mostrarVista('vista-chat');
                    cargarSesion();
                    cargarConversaciones();
                    iniciarAutoRefresco();
                }, 800);
                return;
            } else {
                overlay.className = 'face-overlay scanning';
                status.textContent = data.mensaje || 'No reconocido. Sigue intentando...';
            }
        } catch (e) {
            status.textContent = 'Error de conexión. Reintentando...';
        }
    } else {
        overlay.className = 'face-overlay scanning';
        status.textContent = 'Coloca tu cara dentro del óvalo...';
    }

    setTimeout(() => detectarCicloLogin(video, overlay, status), 1500);
}

function cerrarLoginFacial() {
    FaceState.loginDetecting = false;
    detenerCamara(FaceState.loginStream);
    FaceState.loginStream = null;
    document.getElementById('face-login-modal').style.display = 'none';
}

// -------- REGISTRO FACIAL (en perfil) --------

async function verificarEstadoCara() {
    try {
        const res = await fetch(`${API.auth}?action=tiene_cara`);
        const data = await res.json();
        const statusEl = document.getElementById('face-register-status');
        const iconEl = document.getElementById('face-status-icon');
        const textEl = document.getElementById('face-status-text');
        const btnEl = document.getElementById('btn-registrar-cara');

        if (data.tiene_cara) {
            statusEl.classList.add('active');
            iconEl.textContent = '\u2705';
            textEl.textContent = 'Rostro registrado correctamente';
            btnEl.querySelector('span').textContent = 'Actualizar mi rostro';
        } else {
            statusEl.classList.remove('active');
            iconEl.textContent = '\uD83D\uDEAB';
            textEl.textContent = 'Sin rostro registrado';
            btnEl.querySelector('span').textContent = 'Registrar mi rostro';
        }
    } catch (e) {
        console.error('Error verificando estado facial:', e);
    }
}

async function iniciarRegistroCara() {
    const camera = document.getElementById('face-register-camera');
    const video = document.getElementById('face-register-video');
    const overlay = document.getElementById('face-register-overlay');
    const btnRegistrar = document.getElementById('btn-registrar-cara');
    const btnCancelar = document.getElementById('btn-cancelar-cara');

    btnRegistrar.style.display = 'none';
    btnCancelar.style.display = 'block';
    camera.style.display = 'block';

    const loaded = await cargarModelosFaciales();
    if (!loaded) {
        toast('Error al cargar modelos faciales', 'error');
        cancelarRegistroCara();
        return;
    }

    FaceState.registerStream = await iniciarCamara(video);
    if (!FaceState.registerStream) {
        cancelarRegistroCara();
        return;
    }

    overlay.className = 'face-overlay scanning';
    FaceState.registerDetecting = true;
    toast('Coloca tu cara frente a la cámara. Se capturará automáticamente.', 'info');

    detectarCicloRegistro(video, overlay);
}

async function detectarCicloRegistro(video, overlay) {
    if (!FaceState.registerDetecting) return;

    const detection = await detectarCara(video);

    if (detection && detection.detection.score > 0.7) {
        overlay.className = 'face-overlay detected';
        const descriptor = Array.from(detection.descriptor);

        try {
            const res = await fetch(`${API.auth}?action=registrar_cara`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor })
            });
            const data = await res.json();

            if (data.exito) {
                toast(data.mensaje, 'exito');
                cancelarRegistroCara();
                verificarEstadoCara();
                return;
            } else {
                toast(data.mensaje || 'Error al registrar rostro', 'error');
            }
        } catch (e) {
            toast('Error de conexión', 'error');
        }

        cancelarRegistroCara();
        return;
    }

    overlay.className = 'face-overlay scanning';
    setTimeout(() => detectarCicloRegistro(video, overlay), 1000);
}

function cancelarRegistroCara() {
    FaceState.registerDetecting = false;
    detenerCamara(FaceState.registerStream);
    FaceState.registerStream = null;

    document.getElementById('face-register-camera').style.display = 'none';
    document.getElementById('btn-registrar-cara').style.display = 'block';
    document.getElementById('btn-cancelar-cara').style.display = 'none';
}

// Cargar estado facial al abrir perfil
const _originalAbrirPerfil = typeof abrirPerfil === 'function' ? abrirPerfil : null;

// ============================================
// NOTIFICACIONES WEB
// ============================================

const NotifState = {
    permission: Notification.permission || 'default',
    pollTimer: null,
    lastCheckTime: null,
    notifiedIds: new Set(),
    soundEnabled: true,
};

// Sonido de notificación generado por código (sin archivo externo)
function playNotificationSound() {
    if (!NotifState.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

async function solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        NotifState.permission = perm;
    }
}

function mostrarNotificacionWeb(titulo, cuerpo, icono) {
    if (NotifState.permission !== 'granted') return;
    if (document.hasFocus() && Estado.conversacionActual) return; // No mostrar si está viendo el chat

    try {
        const notif = new Notification(titulo, {
            body: cuerpo,
            icon: icono || '/assets/img/logo.png',
            badge: '/assets/img/logo.png',
            tag: 'chucho-chat-' + Date.now(),
            silent: false,
        });

        notif.onclick = () => {
            window.focus();
            notif.close();
        };

        setTimeout(() => notif.close(), 5000);
    } catch (e) {}
}

function mostrarNotificacionInApp(nombre, contenido, avatar, conversacionId) {
    playNotificationSound();

    const container = document.getElementById('toast-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'notification-toast';
    div.innerHTML = `
        <div class="notif-avatar">${nombre ? nombre.charAt(0).toUpperCase() : '?'}</div>
        <div class="notif-body">
            <span class="notif-name">${nombre || 'Nuevo mensaje'}</span>
            <span class="notif-text">${contenido || ''}</span>
        </div>
        <button class="notif-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    if (conversacionId) {
        div.onclick = (e) => {
            if (e.target.classList.contains('notif-close')) return;
            div.remove();
            // Intentar abrir la conversación
        };
    }

    container.appendChild(div);

    setTimeout(() => {
        if (div.parentElement) {
            div.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => div.remove(), 300);
        }
    }, 5000);
}

async function verificarMensajesNuevos() {
    if (!Estado.usuario) return;

    try {
        const url = NotifState.lastCheckTime
            ? `${API.chat}?action=notificaciones_pendientes&desde=${encodeURIComponent(NotifState.lastCheckTime)}`
            : `${API.chat}?action=notificaciones_pendientes`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.exito && data.mensajes && data.mensajes.length > 0) {
            data.mensajes.forEach(msg => {
                if (!NotifState.notifiedIds.has(msg.id)) {
                    NotifState.notifiedIds.add(msg.id);

                    // Notificación in-app
                    mostrarNotificacionInApp(
                        msg.remitente_completo || msg.remitente_nombre,
                        msg.contenido,
                        msg.remitente_avatar,
                        msg.conversacion_id
                    );

                    // Notificación del navegador
                    mostrarNotificacionWeb(
                        msg.remitente_completo || msg.remitente_nombre || 'Nuevo mensaje',
                        msg.contenido,
                        msg.remitente_avatar
                    );
                }
            });

            // Actualizar la hora del último check
            const ultimaFecha = data.mensajes[0]?.fecha_envio;
            if (ultimaFecha) {
                NotifState.lastCheckTime = ultimaFecha;
            }
        }
    } catch (e) {
        console.error('Error verificando notificaciones:', e);
    }
}

async function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Service Worker registrado:', reg.scope);

        // Escuchar mensajes del SW (cuando abre la app desde notificación)
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'OPEN_CONV' && event.data.conv_id) {
                const conv = Estado.conversaciones?.find(c => c.id === event.data.conv_id);
                if (conv) abrirConversacion(conv);
            }
        });

        // Intentar registrar Background Periodic Sync (Chrome en Android)
        if ('periodicSync' in reg) {
            try {
                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                if (status.state === 'granted') {
                    await reg.periodicSync.register('check-messages', { minInterval: 60 * 1000 });
                    console.log('Periodic Sync registrado (notificaciones en background)');
                }
            } catch (_) {}
        }

        NotifState.swRegistration = reg;
    } catch (e) {
        console.warn('Error registrando Service Worker:', e);
    }
}

function iniciarNotificaciones() {
    solicitarPermisoNotificaciones();
    registrarServiceWorker();

    if (NotifState.pollTimer) clearInterval(NotifState.pollTimer);
    NotifState.lastCheckTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    NotifState.pollTimer = setInterval(verificarMensajesNuevos, 5000);
}

function detenerNotificaciones() {
    if (NotifState.pollTimer) {
        clearInterval(NotifState.pollTimer);
        NotifState.pollTimer = null;
    }
}

// Sobrescribir funciones existentes para integrar notificaciones y cara
(function() {
    // Inyectar verificación facial al abrir perfil
    const perfilModal = document.getElementById('modal-perfil');
    if (perfilModal) {
        const obs = new MutationObserver(() => {
            if (perfilModal.style.display !== 'none') {
                verificarEstadoCara();
            }
        });
        obs.observe(perfilModal, { attributes: true, attributeFilter: ['style'] });
    }

    // Iniciar notificaciones cuando se cargue la sesión
    const origCargarSesion = window.cargarSesion;
    if (typeof origCargarSesion === 'function') {
        window.cargarSesion = async function() {
            await origCargarSesion.apply(this, arguments);
            if (Estado.usuario) {
                iniciarNotificaciones();
            }
        };
    }

    // Detener notificaciones al cerrar sesión
    const origCerrarSesion = window.cerrarSesion;
    if (typeof origCerrarSesion === 'function') {
        window.cerrarSesion = async function() {
            detenerNotificaciones();
            await origCerrarSesion.apply(this, arguments);
        };
    }
})();

// Solicitar permiso de notificaciones al cargar
document.addEventListener('DOMContentLoaded', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        // Esperar a que el usuario interactúe antes de pedir permiso
        document.body.addEventListener('click', function permisoHandler() {
            solicitarPermisoNotificaciones();
            document.body.removeEventListener('click', permisoHandler);
        }, { once: true });
    }
});
