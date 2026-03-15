<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function handle(Request $request)
    {
        $action = (string) $request->query('action', '');
        $this->ensureProfileColumns();

        return match ($action) {
            'registrar' => $this->registrar($request),
            'login' => $this->login($request),
            'verificar' => $this->verificar($request),
            'reenviar_codigo' => $this->reenviar($request),
            'logout' => $this->logout($request),
            'sesion' => $this->sesion($request),
            'perfil' => $this->perfil($request),
            'actualizar_perfil' => $this->actualizarPerfil($request),
            'cambiar_contrasena' => $this->cambiarContrasena($request),
            'subir_avatar' => $this->subirAvatar($request),
            default => response()->json(['error' => 'Acción no válida'], 400),
        };
    }

    private function registrar(Request $request)
    {
        $data = $request->json()->all();
        $required = ['nombre', 'apellido_paterno', 'correo', 'contrasena', 'confirmar_contrasena'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return response()->json(['exito' => false, 'mensaje' => "El campo $field es requerido"]);
            }
        }

        if (!filter_var($data['correo'], FILTER_VALIDATE_EMAIL)) {
            return response()->json(['exito' => false, 'mensaje' => 'El correo no es válido']);
        }

        if (($data['contrasena'] ?? '') !== ($data['confirmar_contrasena'] ?? '')) {
            return response()->json(['exito' => false, 'mensaje' => 'Las contraseñas no coinciden']);
        }

        if (strlen((string) $data['contrasena']) < 6) {
            return response()->json(['exito' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres']);
        }

        $exists = DB::table('usuarios')->where('correo', $data['correo'])->exists();
        if ($exists) {
            return response()->json(['exito' => false, 'mensaje' => 'Este correo ya está registrado']);
        }

        $codigo = strtoupper(substr(md5(random_bytes(16)), 0, 6));
        $expira = now()->addMinutes(30);

        $id = DB::table('usuarios')->insertGetId([
            'nombre' => strip_tags((string) $data['nombre']),
            'apellido_paterno' => strip_tags((string) $data['apellido_paterno']),
            'apellido_materno' => strip_tags((string) ($data['apellido_materno'] ?? '')),
            'correo' => (string) $data['correo'],
            'username' => $this->generarUsername($data['nombre'], $data['apellido_paterno']),
            'telefono' => null,
            'contrasena' => Hash::make((string) $data['contrasena']),
            'codigo_verificacion' => $codigo,
            'codigo_verificacion_expira' => $expira,
            'correo_verificado' => app()->environment('production') ? 0 : 1, // en local: no bloquea
            'fecha_creacion' => now(),
            'fecha_actualizacion' => now(),
            'activo' => 1,
        ]);

        // En producción intentamos mandar correo (si no está configurado, el usuario puede verificar manualmente)
        $enviado = false;
        if (app()->environment('production')) {
            try {
                $enviado = $this->enviarCorreo($data['correo'], $data['nombre'], $codigo);
            } catch (\Throwable $e) {
                $enviado = false;
            }
        }

        $msg = app()->environment('production')
            ? ($enviado ? 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' : 'Registro exitoso. No pude enviar el correo; usa el código de verificación.')
            : "Registro exitoso. Código de verificación (modo local): $codigo";

        return response()->json([
            'exito' => true,
            'mensaje' => $msg,
            'usuario_id' => $id,
            'codigo_local' => app()->environment('production') ? null : $codigo,
        ]);
    }

    private function login(Request $request)
    {
        $data = $request->json()->all();
        $correo = (string) ($data['correo'] ?? '');
        $pass = (string) ($data['contrasena'] ?? '');

        $u = DB::table('usuarios')
            ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'correo', 'username', 'telefono', 'contrasena', 'correo_verificado', 'avatar')
            ->where('correo', $correo)
            ->where('activo', 1)
            ->first();

        if (!$u || !Hash::check($pass, $u->contrasena)) {
            return response()->json(['exito' => false, 'mensaje' => 'Correo o contraseña incorrectos']);
        }

        if (app()->environment('production') && !(int)$u->correo_verificado) {
            return response()->json(['exito' => false, 'mensaje' => 'Debes verificar tu correo primero', 'verificar' => true]);
        }

        DB::table('usuarios')->where('id', $u->id)->update([
            'estado_conexion' => 'conectado',
            'ultimo_acceso' => now(),
            'fecha_actualizacion' => now(),
        ]);

        session([
            'usuario_id' => $u->id,
            'usuario_nombre' => $u->nombre,
            'usuario_correo' => $u->correo,
            'usuario_avatar' => $u->avatar,
            'usuario_username' => $u->username,
            'usuario_telefono' => $u->telefono,
        ]);

        return response()->json([
            'exito' => true,
            'mensaje' => 'Inicio de sesión exitoso',
            'usuario' => [
                'id' => $u->id,
                'nombre' => trim($u->nombre . ' ' . $u->apellido_paterno),
                'correo' => $u->correo,
                'avatar' => $u->avatar,
                'username' => $u->username,
                'telefono' => $u->telefono,
            ],
        ]);
    }

    private function verificar(Request $request)
    {
        $data = $request->json()->all();
        $correo = (string) ($data['correo'] ?? '');
        $codigo = strtoupper((string) ($data['codigo'] ?? ''));

        $u = DB::table('usuarios')
            ->select('id', 'codigo_verificacion', 'codigo_verificacion_expira', 'activo')
            ->where('correo', $correo)
            ->where('activo', 1)
            ->first();

        if (!$u) {
            return response()->json(['exito' => false, 'mensaje' => 'Usuario no encontrado']);
        }

        if (($u->codigo_verificacion ?? '') !== $codigo) {
            return response()->json(['exito' => false, 'mensaje' => 'Código de verificación incorrecto']);
        }

        if ($u->codigo_verificacion_expira && now()->greaterThan($u->codigo_verificacion_expira)) {
            return response()->json(['exito' => false, 'mensaje' => 'El código ha expirado']);
        }

        DB::table('usuarios')->where('id', $u->id)->update([
            'correo_verificado' => 1,
            'codigo_verificacion' => null,
            'codigo_verificacion_expira' => null,
            'fecha_actualizacion' => now(),
        ]);

        return response()->json(['exito' => true, 'mensaje' => 'Correo verificado exitosamente']);
    }

    private function reenviar(Request $request)
    {
        $data = $request->json()->all();
        $correo = (string) ($data['correo'] ?? '');

        $u = DB::table('usuarios')->select('id', 'nombre', 'correo_verificado')->where('correo', $correo)->where('activo', 1)->first();
        if (!$u || (int)$u->correo_verificado === 1) {
            return response()->json(['exito' => false, 'mensaje' => 'Usuario no encontrado o ya verificado']);
        }

        $codigo = strtoupper(substr(md5(random_bytes(16)), 0, 6));
        $expira = now()->addMinutes(30);

        DB::table('usuarios')->where('id', $u->id)->update([
            'codigo_verificacion' => $codigo,
            'codigo_verificacion_expira' => $expira,
            'fecha_actualizacion' => now(),
        ]);

        $enviado = false;
        if (app()->environment('production')) {
            try {
                $enviado = $this->enviarCorreo($correo, $u->nombre, $codigo);
            } catch (\Throwable $e) {
                $enviado = false;
            }
        }

        return response()->json([
            'exito' => true,
            'mensaje' => app()->environment('production')
                ? ($enviado ? 'Código reenviado a tu correo' : 'No pude enviar el correo; usa el nuevo código')
                : "Nuevo código (modo local): $codigo",
            'codigo_local' => app()->environment('production') ? null : $codigo,
        ]);
    }

    private function logout(Request $request)
    {
        $uid = session('usuario_id');
        if ($uid) {
            DB::table('usuarios')->where('id', $uid)->update([
                'estado_conexion' => 'desconectado',
                'fecha_actualizacion' => now(),
            ]);
        }
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['exito' => true, 'mensaje' => 'Sesión cerrada']);
    }

    private function sesion(Request $request)
    {
        if (session()->has('usuario_id')) {
            return response()->json([
                'autenticado' => true,
                'usuario' => [
                    'id' => session('usuario_id'),
                    'nombre' => session('usuario_nombre'),
                    'correo' => session('usuario_correo'),
                    'avatar' => session('usuario_avatar'),
                    'username' => session('usuario_username'),
                    'telefono' => session('usuario_telefono'),
                ],
            ]);
        }
        return response()->json(['autenticado' => false]);
    }

    private function perfil(Request $request)
    {
        if (!session()->has('usuario_id')) {
            return response()->json(['exito' => false, 'mensaje' => 'No autenticado'], 401);
        }

        $u = DB::table('usuarios')
            ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'correo', 'username', 'telefono', 'avatar', 'fecha_creacion')
            ->where('id', session('usuario_id'))
            ->where('activo', 1)
            ->first();

        if (!$u) {
            return response()->json(['exito' => false, 'mensaje' => 'Usuario no encontrado'], 404);
        }

        return response()->json(['exito' => true, 'usuario' => $u]);
    }

    private function actualizarPerfil(Request $request)
    {
        if (!session()->has('usuario_id')) {
            return response()->json(['exito' => false, 'mensaje' => 'No autenticado'], 401);
        }

        $data = $request->json()->all();
        $uid = (int) session('usuario_id');

        $nombre = trim((string) ($data['nombre'] ?? ''));
        $apellidoPaterno = trim((string) ($data['apellido_paterno'] ?? ''));
        $apellidoMaterno = trim((string) ($data['apellido_materno'] ?? ''));
        $correo = trim((string) ($data['correo'] ?? ''));
        $username = trim((string) ($data['username'] ?? ''));
        $telefono = trim((string) ($data['telefono'] ?? ''));

        if ($nombre === '' || $apellidoPaterno === '' || $correo === '') {
            return response()->json(['exito' => false, 'mensaje' => 'Nombre, apellido paterno y correo son obligatorios']);
        }

        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['exito' => false, 'mensaje' => 'El correo no es válido']);
        }

        if ($username === '') {
            $username = $this->generarUsername($nombre, $apellidoPaterno, $uid);
        } else {
            $username = preg_replace('/[^a-zA-Z0-9._]/', '', $username);
            if ($username === '') {
                return response()->json(['exito' => false, 'mensaje' => 'El usuario solo puede llevar letras, números, punto y guion bajo']);
            }
        }

        $correoEnUso = DB::table('usuarios')->where('correo', $correo)->where('id', '!=', $uid)->exists();
        if ($correoEnUso) {
            return response()->json(['exito' => false, 'mensaje' => 'Ese correo ya está en uso']);
        }

        $usernameEnUso = DB::table('usuarios')->where('username', $username)->where('id', '!=', $uid)->exists();
        if ($usernameEnUso) {
            return response()->json(['exito' => false, 'mensaje' => 'Ese nombre de usuario ya está en uso']);
        }

        DB::table('usuarios')->where('id', $uid)->update([
            'nombre' => strip_tags($nombre),
            'apellido_paterno' => strip_tags($apellidoPaterno),
            'apellido_materno' => strip_tags($apellidoMaterno),
            'correo' => $correo,
            'username' => $username,
            'telefono' => $telefono !== '' ? strip_tags($telefono) : null,
            'fecha_actualizacion' => now(),
        ]);

        session([
            'usuario_nombre' => trim($nombre . ' ' . $apellidoPaterno),
            'usuario_correo' => $correo,
            'usuario_username' => $username,
            'usuario_telefono' => $telefono !== '' ? strip_tags($telefono) : null,
        ]);

        return response()->json([
            'exito' => true,
            'mensaje' => 'Perfil actualizado correctamente',
            'usuario' => [
                'id' => $uid,
                'nombre' => trim($nombre . ' ' . $apellidoPaterno),
                'correo' => $correo,
                'username' => $username,
                'telefono' => $telefono !== '' ? strip_tags($telefono) : null,
                'avatar' => session('usuario_avatar'),
            ],
        ]);
    }

    private function cambiarContrasena(Request $request)
    {
        if (!session()->has('usuario_id')) {
            return response()->json(['exito' => false, 'mensaje' => 'No autenticado'], 401);
        }

        $data = $request->json()->all();
        $actual = (string) ($data['contrasena_actual'] ?? '');
        $nueva = (string) ($data['contrasena_nueva'] ?? '');
        $confirmar = (string) ($data['confirmar_contrasena'] ?? '');

        if ($actual === '' || $nueva === '' || $confirmar === '') {
            return response()->json(['exito' => false, 'mensaje' => 'Completa todos los campos de contraseña']);
        }

        if ($nueva !== $confirmar) {
            return response()->json(['exito' => false, 'mensaje' => 'Las contraseñas nuevas no coinciden']);
        }

        if (strlen($nueva) < 6) {
            return response()->json(['exito' => false, 'mensaje' => 'La nueva contraseña debe tener al menos 6 caracteres']);
        }

        if ($actual === $nueva) {
            return response()->json(['exito' => false, 'mensaje' => 'La nueva contraseña debe ser diferente a la actual']);
        }

        $u = DB::table('usuarios')->select('id', 'contrasena')->where('id', session('usuario_id'))->first();
        if (!$u || !Hash::check($actual, $u->contrasena)) {
            return response()->json(['exito' => false, 'mensaje' => 'La contraseña actual es incorrecta']);
        }

        DB::table('usuarios')->where('id', $u->id)->update([
            'contrasena' => Hash::make($nueva),
            'fecha_actualizacion' => now(),
        ]);

        return response()->json(['exito' => true, 'mensaje' => 'Contraseña actualizada correctamente']);
    }

    private function subirAvatar(Request $request)
    {
        if (!session()->has('usuario_id')) {
            return response()->json(['exito' => false, 'mensaje' => 'No autenticado'], 401);
        }

        if (!$request->hasFile('avatar')) {
            return response()->json(['exito' => false, 'mensaje' => 'No se recibió ninguna imagen']);
        }

        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['exito' => false, 'mensaje' => 'La imagen debe ser JPG, PNG o WEBP y pesar máximo 5 MB']);
        }

        $uid = (int) session('usuario_id');
        $u = DB::table('usuarios')->select('avatar')->where('id', $uid)->first();
        $file = $request->file('avatar');
        $dir = public_path('uploads/avatars');

        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = 'avatar_' . $uid . '_' . time() . '.' . $ext;
        $file->move($dir, $name);
        $ruta = '/uploads/avatars/' . $name;

        if ($u && !empty($u->avatar) && str_starts_with((string) $u->avatar, '/uploads/avatars/')) {
            $old = public_path(ltrim((string) $u->avatar, '/'));
            if (is_file($old)) {
                @unlink($old);
            }
        }

        DB::table('usuarios')->where('id', $uid)->update([
            'avatar' => $ruta,
            'fecha_actualizacion' => now(),
        ]);

        session(['usuario_avatar' => $ruta]);

        return response()->json(['exito' => true, 'mensaje' => 'Foto de perfil actualizada', 'avatar' => $ruta]);
    }

    private function ensureProfileColumns(): void
    {
        try {
            if (!Schema::hasColumn('usuarios', 'username')) {
                DB::statement("ALTER TABLE usuarios ADD COLUMN username VARCHAR(60) NULL AFTER correo");
                DB::statement("UPDATE usuarios SET username = LOWER(REPLACE(CONCAT(nombre, '.', apellido_paterno), ' ', '')) WHERE username IS NULL OR username = ''");
                DB::statement("ALTER TABLE usuarios ADD UNIQUE INDEX idx_username_unique (username)");
            }
        } catch (\Throwable $e) {
        }

        try {
            if (!Schema::hasColumn('usuarios', 'telefono')) {
                DB::statement("ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(30) NULL AFTER username");
            }
        } catch (\Throwable $e) {
        }
    }

    private function generarUsername(string $nombre, string $apellidoPaterno, ?int $exceptId = null): string
    {
        $base = strtolower(trim(preg_replace('/[^a-zA-Z0-9._]+/', '', str_replace(' ', '.', $nombre . '.' . $apellidoPaterno))));
        if ($base === '') {
            $base = 'usuario';
        }

        $candidate = $base;
        $i = 1;
        while (DB::table('usuarios')->where('username', $candidate)->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))->exists()) {
            $candidate = $base . $i;
            $i++;
        }

        return $candidate;
    }

    private function enviarCorreo(string $correo, string $nombre, string $codigo): bool
    {
        // Si no hay mail configurado en hosting, esto podría fallar.
        $subject = 'Chucho Chat - Verificación de correo';
        $html = "<div style='font-family:Arial,sans-serif;background:#1a1a2e;color:#e0e0e0;padding:30px'>
            <div style='max-width:520px;margin:0 auto;background:#16213e;border-radius:12px;padding:30px'>
                <h1 style='color:#c0c0c0;text-align:center;margin:0 0 10px'>Chucho Chat</h1>
                <p>Hola <strong>".e($nombre)."</strong>,</p>
                <p>Tu código de verificación es:</p>
                <div style='text-align:center;margin:20px 0'>
                    <span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:#4fc3f7;background:#0a1628;padding:15px 30px;border-radius:8px;display:inline-block'>".e($codigo)."</span>
                </div>
                <p>Este código expira en 30 minutos.</p>
                <p style='color:#888'>Si no solicitaste este código, ignora este mensaje.</p>
            </div>
        </div>";

        Mail::html($html, function ($m) use ($correo, $subject) {
            $m->to($correo)->subject($subject);
        });

        return true;
    }
}
