<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contraseña - Chucho Chat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a1a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: rgba(30, 30, 60, 0.85);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 40px;
            max-width: 440px;
            width: 100%;
            backdrop-filter: blur(12px);
        }
        .logo { text-align: center; font-size: 48px; margin-bottom: 8px; }
        .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #e0e0e0;
            margin-bottom: 6px;
        }
        .subtitle {
            text-align: center;
            color: #888;
            font-size: 13px;
            margin-bottom: 28px;
        }
        label {
            display: block;
            color: #aaa;
            font-size: 13px;
            margin-bottom: 6px;
            margin-top: 14px;
        }
        input[type="password"] {
            width: 100%;
            padding: 14px 16px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            color: #e0e0e0;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        input[type="password"]:focus {
            border-color: #4fc3f7;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            margin-top: 24px;
            background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
            color: #0a0a1a;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .message {
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            display: none;
        }
        .message.success {
            display: block;
            background: rgba(76, 175, 80, 0.15);
            color: #66bb6a;
            border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .message.error {
            display: block;
            background: rgba(244, 67, 54, 0.15);
            color: #ef5350;
            border: 1px solid rgba(244, 67, 54, 0.3);
        }
        .back-link {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: #4fc3f7;
            text-decoration: none;
            font-size: 14px;
        }
        .back-link:hover { text-decoration: underline; }
        .success-container { text-align: center; }
        .success-container .icon { font-size: 64px; margin-bottom: 16px; }
        .hidden { display: none !important; }
        .spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid transparent;
            border-top-color: #0a0a1a;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            vertical-align: middle;
            margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .invalid-token {
            text-align: center;
            padding: 30px 0;
        }
        .invalid-token .icon { font-size: 64px; margin-bottom: 16px; }
        .invalid-token p { color: #888; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">💬</div>
        <div class="title">Chucho Chat</div>

        <!-- Sin token: página inválida -->
        <div id="invalidSection" class="hidden">
            <div class="invalid-token">
                <div class="icon">⚠️</div>
                <h3 style="color:#ef5350">Enlace inválido</h3>
                <p>Este enlace de restablecimiento no es válido o ha expirado.</p>
            </div>
            <a href="/" class="back-link">Volver al inicio</a>
        </div>

        <!-- Formulario de nueva contraseña -->
        <div id="formSection" class="hidden">
            <div class="subtitle">Ingresa tu nueva contraseña</div>

            <form id="resetForm" onsubmit="return handleReset(event)">
                <label for="newPass">Nueva contraseña</label>
                <input type="password" id="newPass" placeholder="Mínimo 6 caracteres" required minlength="6">

                <label for="confirmPass">Confirmar contraseña</label>
                <input type="password" id="confirmPass" placeholder="Repite tu contraseña" required minlength="6">

                <button type="submit" class="btn" id="submitBtn">Restablecer contraseña</button>
            </form>

            <div id="message" class="message"></div>
        </div>

        <!-- Éxito -->
        <div id="successSection" class="hidden">
            <div class="success-container">
                <div class="icon">✅</div>
                <h3 style="margin-bottom:8px">¡Contraseña restablecida!</h3>
                <p style="color:#888;font-size:14px">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
            <a href="/" class="back-link">Ir a iniciar sesión</a>
        </div>
    </div>

    <script>
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const correo = params.get('correo');

        if (!token || !correo) {
            document.getElementById('invalidSection').classList.remove('hidden');
        } else {
            document.getElementById('formSection').classList.remove('hidden');
        }

        async function handleReset(e) {
            e.preventDefault();
            const newPass = document.getElementById('newPass').value;
            const confirmPass = document.getElementById('confirmPass').value;
            const msgEl = document.getElementById('message');
            const btn = document.getElementById('submitBtn');

            msgEl.className = 'message';
            msgEl.style.display = 'none';

            if (newPass !== confirmPass) {
                msgEl.className = 'message error';
                msgEl.textContent = 'Las contraseñas no coinciden';
                msgEl.style.display = 'block';
                return false;
            }

            if (newPass.length < 6) {
                msgEl.className = 'message error';
                msgEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
                msgEl.style.display = 'block';
                return false;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>Procesando...';

            try {
                const resp = await fetch('/api/auth?action=reset_contrasena', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        contrasena: newPass,
                        confirmar_contrasena: confirmPass
                    })
                });

                const data = await resp.json();

                if (data.exito) {
                    document.getElementById('formSection').classList.add('hidden');
                    document.getElementById('successSection').classList.remove('hidden');
                } else {
                    msgEl.className = 'message error';
                    msgEl.textContent = data.mensaje || 'Error al restablecer la contraseña';
                    msgEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Restablecer contraseña';
                }
            } catch (err) {
                msgEl.className = 'message error';
                msgEl.textContent = 'Error de conexión. Intenta de nuevo.';
                msgEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Restablecer contraseña';
            }

            return false;
        }
    </script>
</body>
</html>
