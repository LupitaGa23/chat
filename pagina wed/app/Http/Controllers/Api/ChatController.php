<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CryptoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function handle(Request $request)
    {
        if (!session()->has('usuario_id')) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        $action = (string) $request->query('action', '');

        return match ($action) {
            'conversaciones' => $this->conversaciones(),
            'mensajes' => $this->mensajes($request),
            'enviar' => $this->enviar($request),
            'eliminar_mensaje' => $this->eliminarMensaje($request),
            'nueva_conversacion' => $this->nuevaConversacion($request),
            'buscar_usuarios' => $this->buscarUsuarios($request),
            'todos_usuarios' => $this->todosUsuarios(),
            'chatbot' => $this->chatbotEnConversacion($request),
            'chatbot_directo' => $this->chatbotDirecto($request),
            'poll' => $this->poll($request),
            'config_chatbot' => response()->json(['error' => 'Configuración del bot deshabilitada por seguridad.']),
            default => response()->json(['error' => 'Acción no válida'], 400),
        };
    }

    private function uid(): int
    {
        return (int) session('usuario_id');
    }

    // ============================================
    // CONVERSACIONES
    // ============================================

    private function conversaciones()
    {
        $uid = $this->uid();

        $rows = DB::select(
            "SELECT 
                c.id,
                c.tipo,
                c.nombre_grupo,
                c.fecha_actualizacion,
                CASE 
                    WHEN c.tipo = 'individual' THEN u2.nombre
                    ELSE c.nombre_grupo
                END as nombre_display,
                CASE 
                    WHEN c.tipo = 'individual' THEN CONCAT(u2.nombre, ' ', u2.apellido_paterno)
                    ELSE c.nombre_grupo
                END as nombre_completo,
                CASE 
                    WHEN c.tipo = 'individual' THEN u2.avatar
                    ELSE c.avatar_grupo
                END as avatar_display,
                CASE 
                    WHEN c.tipo = 'individual' THEN u2.estado_conexion
                    ELSE NULL
                END as estado_conexion,
                CASE 
                    WHEN c.tipo = 'individual' THEN u2.id
                    ELSE NULL
                END as otro_usuario_id,
                m.contenido_cifrado as ultimo_mensaje_cifrado,
                m.iv as ultimo_mensaje_iv,
                m.tipo_mensaje as ultimo_tipo_mensaje,
                m.fecha_envio as ultima_fecha,
                m.remitente_id as ultimo_remitente_id,
                (SELECT COUNT(*) FROM mensajes WHERE conversacion_id = c.id AND leido = 0 AND remitente_id != ? AND activo = 1) as no_leidos
            FROM conversaciones c
            JOIN participantes_conversacion pc ON c.id = pc.conversacion_id AND pc.usuario_id = ? AND pc.activo = 1
            LEFT JOIN participantes_conversacion pc2 ON c.id = pc2.conversacion_id AND pc2.usuario_id != ? AND c.tipo = 'individual'
            LEFT JOIN usuarios u2 ON pc2.usuario_id = u2.id
            LEFT JOIN mensajes m ON m.id = (
                SELECT id FROM mensajes WHERE conversacion_id = c.id AND activo = 1 ORDER BY fecha_envio DESC LIMIT 1
            )
            WHERE c.activo = 1
            ORDER BY COALESCE(m.fecha_envio, c.fecha_creacion) DESC",
            [$uid, $uid, $uid]
        );

        $out = [];
        foreach ($rows as $r) {
            $ultimo = CryptoService::decrypt($r->ultimo_mensaje_cifrado ?? null, $r->ultimo_mensaje_iv ?? null);
            $r->ultimo_mensaje = mb_strlen($ultimo) > 40 ? mb_substr($ultimo, 0, 40) . '...' : $ultimo;
            unset($r->ultimo_mensaje_cifrado, $r->ultimo_mensaje_iv);
            $out[] = $r;
        }

        return response()->json($out);
    }

    private function mensajes(Request $request)
    {
        $uid = $this->uid();
        $convId = (int) $request->query('conversacion_id', 0);
        $antesDe = $request->query('antes_de');

        $isPart = DB::table('participantes_conversacion')
            ->where('conversacion_id', $convId)
            ->where('usuario_id', $uid)
            ->where('activo', 1)
            ->exists();

        if (!$isPart) {
            return response()->json(['error' => 'No tienes acceso a esta conversación']);
        }

        $query = DB::table('mensajes as m')
            ->join('usuarios as u', 'm.remitente_id', '=', 'u.id')
            ->where('m.conversacion_id', $convId)
            ->where('m.activo', 1)
            ->select(
                'm.id',
                'm.remitente_id',
                'm.contenido_cifrado',
                'm.iv',
                'm.tipo_mensaje',
                'm.archivo_nombre',
                'm.archivo_ruta',
                'm.archivo_tamano',
                'm.leido',
                'm.fecha_envio',
                'm.editado',
                'u.nombre as remitente_nombre',
                DB::raw("CONCAT(u.nombre,' ',u.apellido_paterno) as remitente_completo"),
                'u.avatar as remitente_avatar'
            );

        if ($antesDe) {
            $query->where('m.fecha_envio', '<', $antesDe);
        }

        $mensajes = $query->orderByDesc('m.fecha_envio')->limit(50)->get();

        $out = [];
        foreach ($mensajes as $msg) {
            $msg->contenido = CryptoService::decrypt($msg->contenido_cifrado, $msg->iv);
            $msg->es_mio = ((int) $msg->remitente_id === $uid);
            unset($msg->contenido_cifrado, $msg->iv);
            $out[] = $msg;
        }

        DB::table('mensajes')
            ->where('conversacion_id', $convId)
            ->where('remitente_id', '!=', $uid)
            ->where('leido', 0)
            ->update(['leido' => 1]);

        return response()->json(array_reverse($out));
    }

    private function nuevaConversacion(Request $request)
    {
        $uid = $this->uid();
        $data = $request->json()->all();
        $otro = (int) ($data['otro_usuario_id'] ?? 0);

        if ($otro <= 0 || $otro === $uid) {
            return response()->json(['error' => 'Usuario inválido'], 400);
        }

        $existing = DB::selectOne(
            "SELECT c.id
             FROM conversaciones c
             JOIN participantes_conversacion p1 ON c.id=p1.conversacion_id AND p1.usuario_id=? AND p1.activo=1
             JOIN participantes_conversacion p2 ON c.id=p2.conversacion_id AND p2.usuario_id=? AND p2.activo=1
             WHERE c.tipo='individual' AND c.activo=1
             LIMIT 1",
            [$uid, $otro]
        );

        if ($existing) {
            return response()->json(['exito' => true, 'conversacion_id' => $existing->id, 'ya_existia' => true]);
        }

        $convId = DB::table('conversaciones')->insertGetId([
            'tipo' => 'individual',
            'creador_id' => $uid,
            'fecha_creacion' => now(),
            'fecha_actualizacion' => now(),
            'activo' => 1,
        ]);

        DB::table('participantes_conversacion')->insert([
            [
                'conversacion_id' => $convId,
                'usuario_id' => $uid,
                'rol' => 'admin',
                'fecha_union' => now(),
                'activo' => 1,
            ],
            [
                'conversacion_id' => $convId,
                'usuario_id' => $otro,
                'rol' => 'miembro',
                'fecha_union' => now(),
                'activo' => 1,
            ],
        ]);

        return response()->json(['exito' => true, 'conversacion_id' => $convId]);
    }

    // ============================================
    // MENSAJES
    // ============================================

    private function enviar(Request $request)
    {
        $uid = $this->uid();

        $convId = (int) ($request->input('conversacion_id', $request->json('conversacion_id', 0)));
        $contenido = (string) ($request->input('contenido', $request->json('contenido', '')));
        $tipo = (string) ($request->input('tipo', $request->json('tipo', 'texto')));

        if ($convId <= 0) {
            return response()->json(['error' => 'Conversación inválida'], 400);
        }

        $isPart = DB::table('participantes_conversacion')
            ->where('conversacion_id', $convId)
            ->where('usuario_id', $uid)
            ->where('activo', 1)
            ->exists();

        if (!$isPart) {
            return response()->json(['error' => 'No tienes acceso a esta conversación'], 403);
        }

        $archivoNombre = null;
        $archivoRuta = null;
        $archivoTamano = null;

        if ($request->hasFile('archivo')) {
            $file = $request->file('archivo');

            if (!$file->isValid()) {
                return response()->json(['error' => 'Archivo inválido'], 400);
            }

            $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
            $mime = strtolower($file->getMimeType() ?: 'application/octet-stream');
            $archivoTamano = (int) $file->getSize();

            $permitidos = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','txt','zip','rar','mp3','wav','ogg','webm','m4a','aac'];

            if (!in_array($ext, $permitidos, true)) {
                return response()->json(['error' => 'Tipo de archivo no permitido'], 422);
            }

            if ($archivoTamano > 15 * 1024 * 1024) {
                return response()->json(['error' => 'El archivo supera los 15 MB'], 422);
            }

            if ($tipo === 'texto') {
                if (str_starts_with($mime, 'image/')) {
                    $tipo = 'imagen';
                } elseif (str_starts_with($mime, 'audio/')) {
                    $tipo = 'audio';
                } else {
                    $tipo = 'documento';
                }
            }

            if ($tipo === 'audio') {
                $mimesAudioPermitidos = [
                    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a',
                    'audio/aac', 'audio/webm', 'audio/ogg', 'application/ogg', 'video/webm'
                ];

                $esAudioValido = str_starts_with($mime, 'audio/')
                    || in_array($mime, $mimesAudioPermitidos, true)
                    || in_array($ext, ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'oga'], true);

                if (!$esAudioValido) {
                    return response()->json(['error' => 'La nota de voz debe ser un archivo de audio'], 422);
                }
            }

            $uploadDir = public_path('uploads/chat');
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            $safeBase = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
            $safeBase = $safeBase !== '' ? $safeBase : 'archivo';
            $storedName = now()->format('YmdHis') . '_' . Str::random(8) . '_' . $safeBase . '.' . $ext;
            $file->move($uploadDir, $storedName);

            $archivoNombre = $file->getClientOriginalName();
            $archivoRuta = '/uploads/chat/' . $storedName;

            if (trim($contenido) === '') {
                $contenido = $tipo === 'audio' ? '🎤 Nota de voz' : $archivoNombre;
            }
        }

        if (trim($contenido) === '') {
            return response()->json(['error' => 'Datos inválidos'], 400);
        }

        $enc = CryptoService::encrypt($contenido);

        $id = DB::table('mensajes')->insertGetId([
            'conversacion_id' => $convId,
            'remitente_id' => $uid,
            'contenido_cifrado' => $enc['cifrado'],
            'iv' => $enc['iv'],
            'tipo_mensaje' => $tipo,
            'archivo_nombre' => $archivoNombre,
            'archivo_ruta' => $archivoRuta,
            'archivo_tamano' => $archivoTamano,
            'leido' => 0,
            'fecha_envio' => now(),
            'activo' => 1,
        ]);

        DB::table('conversaciones')->where('id', $convId)->update(['fecha_actualizacion' => now()]);

        return response()->json([
            'exito' => true,
            'mensaje_id' => $id,
            'contenido' => $contenido,
            'tipo_mensaje' => $tipo,
            'archivo_nombre' => $archivoNombre,
            'archivo_ruta' => $archivoRuta,
            'archivo_tamano' => $archivoTamano,
            'fecha_envio' => now()->format('Y-m-d H:i:s'),
        ]);
    }

    private function eliminarMensaje(Request $request)
    {
        $uid = $this->uid();
        $data = $request->json()->all();
        $mensajeId = (int) ($data['mensaje_id'] ?? 0);

        $mensaje = DB::table('mensajes')->where('id', $mensajeId)->where('remitente_id', $uid)->where('activo', 1)->first();
        if (!$mensaje) {
            return response()->json(['error' => 'Mensaje no encontrado']);
        }

        DB::table('historial_mensajes')->insert([
            'mensaje_id' => $mensaje->id,
            'conversacion_id' => $mensaje->conversacion_id,
            'remitente_id' => $mensaje->remitente_id,
            'contenido_cifrado' => $mensaje->contenido_cifrado,
            'iv' => $mensaje->iv,
            'tipo_mensaje' => $mensaje->tipo_mensaje,
            'archivo_nombre' => $mensaje->archivo_nombre,
            'archivo_ruta' => $mensaje->archivo_ruta,
            'fecha_envio_original' => $mensaje->fecha_envio,
            'fecha_eliminacion' => now(),
            'eliminado_por' => $uid,
            'motivo' => 'eliminado por usuario',
        ]);

        DB::table('mensajes')->where('id', $mensajeId)->update(['activo' => 0]);

        return response()->json(['exito' => true, 'mensaje' => 'Mensaje eliminado']);
    }

    // ============================================
    // USUARIOS
    // ============================================

    private function buscarUsuarios(Request $request)
    {
        $uid = $this->uid();
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $users = DB::table('usuarios')
            ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'correo', 'avatar', 'estado_conexion', 'ultimo_acceso')
            ->where('id', '!=', $uid)
            ->where('activo', 1)
            ->where(function ($w) use ($q) {
                $w->where('nombre', 'like', "%$q%")
                    ->orWhere('apellido_paterno', 'like', "%$q%")
                    ->orWhere('apellido_materno', 'like', "%$q%")
                    ->orWhere('correo', 'like', "%$q%");
            })
            ->orderByRaw("estado_conexion = 'conectado' DESC")
            ->orderBy('nombre')
            ->limit(20)
            ->get();

        return response()->json($users);
    }

    private function todosUsuarios()
    {
        $uid = $this->uid();
        $users = DB::table('usuarios')
            ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'correo', 'avatar', 'estado_conexion', 'ultimo_acceso')
            ->where('id', '!=', $uid)
            ->where('activo', 1)
            ->where('correo_verificado', 1)
            ->orderByRaw("estado_conexion = 'conectado' DESC")
            ->orderBy('nombre')
            ->get();

        return response()->json($users);
    }

    // ============================================
    // CHATBOT
    // ============================================

    private function geminiAsk(string $mensaje, array $historial = []): array
    {
        $apiKey = (string) config('chucho.chatbot_api_key', '');
        if ($apiKey === '') {
            return ['ok' => false, 'error' => 'Chatbot no configurado: falta GEMINI_API_KEY en .env'];
        }

        $model = (string) config('chucho.chatbot_model', 'gemini-2.0-flash');
        $contents = [];
        foreach ($historial as $h) {
            $contents[] = [
                'role' => ($h['role'] ?? 'user') === 'user' ? 'user' : 'model',
                'parts' => [['text' => (string) ($h['content'] ?? '')]],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $mensaje]]];

        $payload = [
            'contents' => $contents,
            'systemInstruction' => [
                'parts' => [[
                    'text' => (string) config('chucho.chatbot_system_prompt'),
                ]],
            ],
            'generationConfig' => [
                'temperature' => (float) config('chucho.chatbot_temperature', 0.7),
                'maxOutputTokens' => (int) config('chucho.chatbot_max_tokens', 1000),
            ],
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent';

        try {
            $resp = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url . '?key=' . urlencode($apiKey), $payload);

            if (!$resp->successful()) {
                $body = $resp->json();
                $msg = $body['error']['message'] ?? ('Error HTTP ' . $resp->status());
                return ['ok' => false, 'error' => 'Error de la API: ' . $msg];
            }

            $json = $resp->json();
            $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? 'Sin respuesta';
            return ['ok' => true, 'text' => $text];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Error de conexión: ' . $e->getMessage()];
        }
    }

    private function chatbotDirecto(Request $request)
    {
        $data = $request->json()->all();
        $mensaje = trim((string) ($data['mensaje'] ?? ''));
        if ($mensaje === '') {
            return response()->json(['error' => 'Mensaje vacío']);
        }

        $provider = (string) config('chucho.chatbot_provider', 'gemini');
        if ($provider !== 'gemini') {
            return response()->json(['error' => 'Proveedor no soportado en esta versión (solo gemini)']);
        }

        $historial = is_array($data['historial'] ?? null) ? $data['historial'] : [];
        $ans = $this->geminiAsk($mensaje, $historial);
        if (!$ans['ok']) {
            return response()->json(['error' => $ans['error'] ?? 'Error del bot']);
        }

        return response()->json(['exito' => true, 'contenido' => $ans['text']]);
    }

    private function chatbotEnConversacion(Request $request)
    {
        $uid = $this->uid();
        $data = $request->json()->all();
        $convId = (int) ($data['conversacion_id'] ?? 0);
        $mensaje = trim((string) ($data['mensaje'] ?? ''));

        if ($convId <= 0 || $mensaje === '') {
            return response()->json(['error' => 'Datos inválidos'], 400);
        }

        $isPart = DB::table('participantes_conversacion')
            ->where('conversacion_id', $convId)
            ->where('usuario_id', $uid)
            ->where('activo', 1)
            ->exists();

        if (!$isPart) {
            return response()->json(['error' => 'No tienes acceso a esta conversación'], 403);
        }

        $historial = is_array($data['historial'] ?? null) ? $data['historial'] : [];
        $ans = $this->geminiAsk($mensaje, $historial);
        if (!$ans['ok']) {
            return response()->json(['error' => $ans['error'] ?? 'Error del bot']);
        }

        $respuesta = (string) $ans['text'];

        // Guardar respuesta del bot como mensaje tipo chatbot
        $encBot = CryptoService::encrypt($respuesta);
        $msgId = DB::table('mensajes')->insertGetId([
            'conversacion_id' => $convId,
            'remitente_id' => $uid,
            'contenido_cifrado' => $encBot['cifrado'],
            'iv' => $encBot['iv'],
            'tipo_mensaje' => 'chatbot',
            'leido' => 1,
            'fecha_envio' => now(),
            'activo' => 1,
        ]);

        DB::table('conversaciones')->where('id', $convId)->update(['fecha_actualizacion' => now()]);

        return response()->json([
            'exito' => true,
            'mensaje_id' => $msgId,
            'contenido' => $respuesta,
        ]);
    }

    // ============================================
    // LONG POLL
    // ============================================

    private function poll(Request $request)
    {
        $uid = $this->uid();
        $convId = (int) $request->query('conversacion_id', 0);
        $ultimoId = (int) $request->query('ultimo_id', 0);

        $isPart = DB::table('participantes_conversacion')
            ->where('conversacion_id', $convId)
            ->where('usuario_id', $uid)
            ->where('activo', 1)
            ->exists();

        if (!$isPart) {
            return response()->json(['error' => 'No tienes acceso a esta conversación'], 403);
        }

        $start = microtime(true);
        $timeout = 20;

        while ((microtime(true) - $start) < $timeout) {
            $nuevos = DB::table('mensajes as m')
                ->join('usuarios as u', 'm.remitente_id', '=', 'u.id')
                ->where('m.conversacion_id', $convId)
                ->where('m.id', '>', $ultimoId)
                ->where('m.activo', 1)
                ->orderBy('m.fecha_envio')
                ->select(
                    'm.id',
                    'm.remitente_id',
                    'm.contenido_cifrado',
                    'm.iv',
                    'm.tipo_mensaje',
                    'm.archivo_nombre',
                    'm.archivo_ruta',
                    'm.fecha_envio',
                    'u.nombre as remitente_nombre',
                    DB::raw("CONCAT(u.nombre,' ',u.apellido_paterno) as remitente_completo"),
                    'u.avatar as remitente_avatar'
                )
                ->get();

            if ($nuevos->isNotEmpty()) {
                $out = [];
                foreach ($nuevos as $msg) {
                    $msg->contenido = CryptoService::decrypt($msg->contenido_cifrado, $msg->iv);
                    $msg->es_mio = ((int) $msg->remitente_id === $uid);
                    unset($msg->contenido_cifrado, $msg->iv);
                    $out[] = $msg;
                }
                return response()->json(['exito' => true, 'mensajes' => $out]);
            }

            usleep(1000000);
        }

        return response()->json(['exito' => true, 'mensajes' => []]);
    }
}
