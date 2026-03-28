<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chucho Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo e(asset('assets/css/style.css')); ?>">
</head>
<body>
    <!-- ============ PANTALLA DE LOGIN ============ -->
    <div id="vista-login" class="vista activa">
        <div class="auth-container">
            <div class="auth-glass">
                <div class="auth-logo">
                    <div class="logo-icon">
                        <svg viewBox="0 0 48 48" fill="none">
                            <path d="M24 4C12.95 4 4 11.95 4 21.5C4 27.13 7.12 32.08 12 35.22V44L20.36 39.12C21.53 39.36 22.75 39.5 24 39.5C35.05 39.5 44 31.55 44 22C44 12.45 35.05 4 24 4Z" fill="url(#grad1)"/>
                            <defs>
                                <linearGradient id="grad1" x1="4" y1="4" x2="44" y2="44">
                                    <stop offset="0%" stop-color="#C0C0C0"/>
                                    <stop offset="100%" stop-color="#4FC3F7"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1>Chucho Chat</h1>
                    <p class="auth-subtitle">Mensajería cifrada de extremo a extremo</p>
                </div>

                <form id="form-login" onsubmit="return false;">
                    <div class="input-group">
                        <span class="input-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </span>
                        <input type="email" id="login-correo" placeholder="Correo electrónico" required autocomplete="email">
                    </div>
                    <div class="input-group">
                        <span class="input-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                        <input type="password" id="login-contrasena" placeholder="Contraseña" required autocomplete="current-password">
                        <button type="button" class="toggle-pass" onclick="togglePassword('login-contrasena', this)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                    <button type="submit" class="btn-primary" onclick="hacerLogin()">
                        <span>Iniciar Sesión</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                </form>

                <div class="auth-divider">
                    <span>o</span>
                </div>

                <button class="btn-secondary" onclick="mostrarVista('vista-registro')">
                    <span>Crear cuenta nueva</span>
                </button>

                <div id="login-mensaje" class="auth-mensaje"></div>
            </div>

            <div class="auth-particles">
                <div class="particle p1"></div>
                <div class="particle p2"></div>
                <div class="particle p3"></div>
                <div class="particle p4"></div>
                <div class="particle p5"></div>
            </div>
        </div>
    </div>

    <!-- ============ PANTALLA DE REGISTRO ============ -->
    <div id="vista-registro" class="vista">
        <div class="auth-container">
            <div class="auth-glass">
                <div class="auth-logo">
                    <h2>Crear Cuenta</h2>
                    <p class="auth-subtitle">Únete a Chucho Chat</p>
                </div>

                <form id="form-registro" onsubmit="return false;">
                    <div class="input-row">
                        <div class="input-group">
                            <input type="text" id="reg-nombre" placeholder="Nombre *" required>
                        </div>
                        <div class="input-group">
                            <input type="text" id="reg-apellido-paterno" placeholder="Apellido Paterno *" required>
                        </div>
                    </div>
                    <div class="input-group">
                        <input type="text" id="reg-apellido-materno" placeholder="Apellido Materno (Opcional)">
                    </div>
                    <div class="input-group">
                        <span class="input-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </span>
                        <input type="email" id="reg-correo" placeholder="Correo electrónico *" required>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <span class="input-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </span>
                            <input type="password" id="reg-contrasena" placeholder="Contraseña *" required>
                        </div>
                        <div class="input-group">
                            <span class="input-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </span>
                            <input type="password" id="reg-confirmar" placeholder="Confirmar *" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" onclick="hacerRegistro()">
                        <span>Registrarme</span>
                    </button>
                </form>

                <button class="btn-link" onclick="mostrarVista('vista-login')">¿Ya tienes cuenta? Ir al Login</button>

                <div id="registro-mensaje" class="auth-mensaje"></div>
            </div>
        </div>
    </div>

    <!-- ============ PANTALLA DE VERIFICACIÓN ============ -->
    <div id="vista-verificacion" class="vista">
        <div class="auth-container">
            <div class="auth-glass">
                <div class="auth-logo">
                    <div class="verificacion-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                    <h2>Verificar Correo</h2>
                    <p class="auth-subtitle">Ingresa el código de 6 caracteres</p>
                    <p class="auth-subtitle" id="verificacion-correo-text"></p>
                </div>

                <form id="form-verificacion" onsubmit="return false;">
                    <div class="code-inputs">
                        <input type="text" maxlength="1" class="code-input" data-index="0" oninput="moverCodigo(this, 0)" onkeydown="retrocederCodigo(event, 0)">
                        <input type="text" maxlength="1" class="code-input" data-index="1" oninput="moverCodigo(this, 1)" onkeydown="retrocederCodigo(event, 1)">
                        <input type="text" maxlength="1" class="code-input" data-index="2" oninput="moverCodigo(this, 2)" onkeydown="retrocederCodigo(event, 2)">
                        <input type="text" maxlength="1" class="code-input" data-index="3" oninput="moverCodigo(this, 3)" onkeydown="retrocederCodigo(event, 3)">
                        <input type="text" maxlength="1" class="code-input" data-index="4" oninput="moverCodigo(this, 4)" onkeydown="retrocederCodigo(event, 4)">
                        <input type="text" maxlength="1" class="code-input" data-index="5" oninput="moverCodigo(this, 5)" onkeydown="retrocederCodigo(event, 5)">
                    </div>
                    <button type="submit" class="btn-primary" onclick="verificarCodigo()">
                        <span>Verificar</span>
                    </button>
                </form>

                <button class="btn-link" onclick="reenviarCodigo()">Reenviar código</button>
                <button class="btn-link" onclick="mostrarVista('vista-login')">Volver al Login</button>

                <div id="verificacion-mensaje" class="auth-mensaje"></div>
            </div>
        </div>
    </div>

    <!-- ============ PANTALLA PRINCIPAL DE CHAT ============ -->
    <div id="vista-chat" class="vista">
        <div class="chat-app">
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="user-info">
                        <div class="avatar-sm" id="mi-avatar">
                            <span id="mi-inicial"></span>
                        </div>
                        <span class="user-name" id="mi-nombre"></span>
                    </div>
                    <div class="sidebar-actions">
                        <button class="icon-btn" onclick="toggleUsuariosRegistrados()" title="Usuarios registrados">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </button>
                        <button class="icon-btn" onclick="abrirPerfil()" title="Perfil y ajustes">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.1a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.15V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 20.85 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        </button>
                        <button class="icon-btn" onclick="cerrarSesion()" title="Cerrar Sesión">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Chatbot fijo tipo Meta AI -->
                <div class="chatbot-entry" onclick="abrirChatBot()">
                    <div class="chatbot-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1.5" fill="#fff"/><circle cx="15" cy="14" r="1.5" fill="#fff"/></svg>
                    </div>
                    <div class="chatbot-entry-info">
                        <span class="chatbot-entry-name">Chucho Bot IA</span>
                        <span class="chatbot-entry-desc">Pregúntame lo que quieras</span>
                    </div>
                    <div class="chatbot-entry-badge">IA</div>
                </div>

                <div class="search-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="buscar-chat" placeholder="Buscar o iniciar un nuevo chat" oninput="buscarChats(this.value)">
                </div>

                <div class="chat-list" id="lista-conversaciones">
                    <!-- Se llena dinámicamente -->
                </div>

                <!-- Resultados de búsqueda de usuarios -->
                <div class="search-results" id="resultados-busqueda" style="display:none;">
                    <h4>Usuarios encontrados</h4>
                    <div id="lista-usuarios-busqueda"></div>
                </div>
            </aside>

            <!-- Área de chat -->
            <main class="chat-area" id="chat-area">
                <!-- Estado vacío -->
                <div class="chat-empty" id="chat-vacio">
                    <div class="empty-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3>Chucho Chat</h3>
                    <p>Selecciona un chat o busca un usuario para comenzar</p>
                    <p class="encrypted-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Los mensajes están cifrados. Nadie fuera de este chat puede leerlos.
                    </p>
                </div>

                <!-- Chat activo -->
                <div class="chat-active" id="chat-activo" style="display:none;">
                    <header class="chat-header">
                        <button class="icon-btn back-btn" onclick="cerrarChat()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <div class="avatar-sm chat-header-avatar" id="chat-avatar">
                            <span id="chat-inicial"></span>
                        </div>
                        <div class="chat-header-info">
                            <h4 id="chat-nombre"></h4>
                            <span class="chat-status" id="chat-estado"></span>
                        </div>
                        <div class="chat-header-actions">
                        </div>
                    </header>

                    <div class="messages-container" id="contenedor-mensajes">
                        <div class="messages-list" id="lista-mensajes">
                            <!-- Se llena dinámicamente -->
                        </div>
                    </div>

                    <!-- Emoji picker -->
                    <div class="emoji-picker" id="emoji-picker" style="display:none;">
                        <div class="emoji-grid" id="emoji-grid">
                            <!-- Se llena con JS -->
                        </div>
                    </div>

                    <footer class="chat-footer">
                        <button class="icon-btn" onclick="document.getElementById('input-archivo').click()" title="Adjuntar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </button>
                        <input type="file" id="input-archivo" style="display:none" onchange="enviarArchivo(this)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip">
                        
                        <button class="icon-btn" onclick="toggleEmojis()" title="Emojis">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </button>

                        <div class="message-input-wrapper">
                            <input type="text" id="input-mensaje" placeholder="Escribe un mensaje" onkeypress="if(event.key==='Enter')enviarMensaje()">
                        </div>

                        <button class="btn-send" onclick="enviarMensaje()" title="Enviar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    </div>

    <!-- ============ MODAL USUARIOS REGISTRADOS ============ -->
    <div class="modal-overlay" id="modal-usuarios" style="display:none;" onclick="if(event.target===this)toggleUsuariosRegistrados()">
        <div class="modal-content modal-usuarios">
            <div class="modal-header">
                <h3>Usuarios Registrados</h3>
                <button class="icon-btn" onclick="toggleUsuariosRegistrados()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body" style="padding:0;">
                <div style="padding:12px 20px;">
                    <div class="input-group" style="margin-bottom:0;">
                        <input type="text" id="filtro-usuarios" placeholder="Filtrar usuarios..." oninput="filtrarUsuariosLista(this.value)" style="padding-left:16px;">
                    </div>
                </div>
                <div class="usuarios-lista" id="lista-todos-usuarios">
                    <div style="text-align:center;padding:30px;color:var(--texto-dark);">
                        <div class="spinner"></div>
                        <p style="margin-top:10px;font-size:13px;">Cargando usuarios...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- ============ MODAL PERFIL ============ -->
    <div class="modal-overlay" id="modal-perfil" style="display:none;" onclick="if(event.target===this)cerrarPerfil()">
        <div class="modal-content modal-perfil">
            <div class="modal-header">
                <h3>Mi perfil</h3>
                <button class="icon-btn" onclick="cerrarPerfil()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body perfil-modal-body">
                <div class="perfil-avatar-panel">
                    <div class="avatar-perfil-grande" id="perfil-avatar-preview"><span id="perfil-avatar-inicial">U</span></div>
                    <div class="perfil-avatar-actions">
                        <button class="btn-secondary" type="button" onclick="document.getElementById('perfil-avatar-file').click()">Subir imagen</button>
                        <button class="btn-secondary" type="button" onclick="document.getElementById('perfil-avatar-camera').click()">Tomar foto</button>
                    </div>
                    <input type="file" id="perfil-avatar-file" accept="image/*" style="display:none" onchange="subirAvatarPerfil(this)">
                    <input type="file" id="perfil-avatar-camera" accept="image/*" capture="user" style="display:none" onchange="subirAvatarPerfil(this)">
                    <p class="perfil-help">Puedes usar una imagen del equipo o abrir la cámara del celular si el navegador lo permite.</p>
                </div>

                <div class="perfil-form-panel">
                    <div class="perfil-grid">
                        <div class="input-group"><input type="text" id="perfil-nombre" placeholder="Nombre"></div>
                        <div class="input-group"><input type="text" id="perfil-apellido-paterno" placeholder="Apellido paterno"></div>
                        <div class="input-group"><input type="text" id="perfil-apellido-materno" placeholder="Apellido materno"></div>
                        <div class="input-group"><input type="text" id="perfil-username" placeholder="Usuario"></div>
                        <div class="input-group"><input type="email" id="perfil-correo" placeholder="Correo"></div>
                        <div class="input-group"><input type="text" id="perfil-telefono" placeholder="Teléfono"></div>
                    </div>
                    <div class="perfil-actions">
                        <button class="btn-primary" type="button" onclick="guardarPerfil()"><span>Guardar cambios</span></button>
                    </div>

                    <div class="perfil-password-box">
                        <h4>Cambiar contraseña</h4>
                        <div class="perfil-grid">
                            <div class="input-group"><input type="password" id="perfil-pass-actual" placeholder="Contraseña actual"></div>
                            <div class="input-group"><input type="password" id="perfil-pass-nueva" placeholder="Nueva contraseña"></div>
                            <div class="input-group"><input type="password" id="perfil-pass-confirmar" placeholder="Confirmar nueva contraseña"></div>
                        </div>
                        <div class="perfil-actions">
                            <button class="btn-secondary" type="button" onclick="cambiarPasswordPerfil()">Actualizar contraseña</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notificación toast -->
    <div class="toast-container" id="toast-container"></div>

    <script src="<?php echo e(asset('assets/js/app.js')); ?>"></script>
</body>
</html>
<?php /**PATH C:\Users\andyg\OneDrive\Desktop\public_html_perfil_modificado\resources\views/chat.blade.php ENDPATH**/ ?>