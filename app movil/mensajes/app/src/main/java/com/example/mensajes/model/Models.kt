package com.example.mensajes.model

import com.google.gson.annotations.SerializedName

// ========== AUTH ==========

data class LoginRequest(
    val correo: String,
    val contrasena: String
)

data class RegisterRequest(
    val nombre: String,
    val apellido_paterno: String,
    val apellido_materno: String = "",
    val correo: String,
    val contrasena: String,
    val confirmar_contrasena: String
)

data class VerifyRequest(
    val correo: String,
    val codigo: String
)

data class AuthResponse(
    val exito: Boolean = false,
    val mensaje: String = "",
    val usuario: Usuario? = null,
    val verificar: Boolean = false,
    @SerializedName("codigo_local") val codigoLocal: String? = null,
    @SerializedName("usuario_id") val usuarioId: Int? = null
)

data class Usuario(
    val id: Int = 0,
    val nombre: String = "",
    val correo: String = "",
    val avatar: String? = null,
    val username: String? = null,
    val telefono: String? = null,
    @SerializedName("apellido_paterno") val apellidoPaterno: String? = null,
    @SerializedName("apellido_materno") val apellidoMaterno: String? = null,
    @SerializedName("estado_conexion") val estadoConexion: String? = null,
    @SerializedName("ultimo_acceso") val ultimoAcceso: String? = null
)

data class SessionResponse(
    val autenticado: Boolean = false,
    val usuario: Usuario? = null
)

data class ProfileUpdateRequest(
    val nombre: String,
    val apellido_paterno: String,
    val apellido_materno: String = "",
    val correo: String,
    val username: String,
    val telefono: String = ""
)

data class PasswordChangeRequest(
    val contrasena_actual: String,
    val contrasena_nueva: String,
    val confirmar_contrasena: String
)

data class AvatarResponse(
    val exito: Boolean = false,
    val mensaje: String = "",
    val avatar: String? = null
)

// ========== CHAT ==========

data class Conversacion(
    val id: Int = 0,
    val tipo: String = "individual",
    @SerializedName("nombre_grupo") val nombreGrupo: String? = null,
    @SerializedName("nombre_display") val nombreDisplay: String? = null,
    @SerializedName("nombre_completo") val nombreCompleto: String? = null,
    @SerializedName("avatar_display") val avatarDisplay: String? = null,
    @SerializedName("estado_conexion") val estadoConexion: String? = null,
    @SerializedName("otro_usuario_id") val otroUsuarioId: Int? = null,
    @SerializedName("ultimo_mensaje") val ultimoMensaje: String? = null,
    @SerializedName("ultimo_tipo_mensaje") val ultimoTipoMensaje: String? = null,
    @SerializedName("ultima_fecha") val ultimaFecha: String? = null,
    @SerializedName("no_leidos") val noLeidos: Int = 0,
    @SerializedName("fecha_actualizacion") val fechaActualizacion: String? = null
)

data class Mensaje(
    val id: Int = 0,
    @SerializedName("remitente_id") val remitenteId: Int = 0,
    val contenido: String? = "",
    @SerializedName("tipo_mensaje") val tipoMensaje: String? = "texto",
    @SerializedName("archivo_nombre") val archivoNombre: String? = null,
    @SerializedName("archivo_ruta") val archivoRuta: String? = null,
    @SerializedName("archivo_tamano") val archivoTamano: Long? = null,
    val leido: Int = 0,
    @SerializedName("fecha_envio") val fechaEnvio: String? = "",
    val editado: Int = 0,
    @SerializedName("remitente_nombre") val remitenteNombre: String? = "",
    @SerializedName("remitente_completo") val remitenteCompleto: String? = "",
    @SerializedName("remitente_avatar") val remitenteAvatar: String? = null,
    @SerializedName("es_mio") val esMio: Boolean = false
)

data class SendMessageResponse(
    val exito: Boolean = false,
    val error: String? = null,
    @SerializedName("mensaje_id") val mensajeId: Int? = null,
    val contenido: String? = null,
    @SerializedName("tipo_mensaje") val tipoMensaje: String? = null,
    @SerializedName("archivo_nombre") val archivoNombre: String? = null,
    @SerializedName("archivo_ruta") val archivoRuta: String? = null,
    @SerializedName("fecha_envio") val fechaEnvio: String? = null
)

data class NewConversationRequest(
    val otro_usuario_id: Int
)

data class NewConversationResponse(
    val exito: Boolean = false,
    @SerializedName("conversacion_id") val conversacionId: Int? = null,
    @SerializedName("ya_existia") val yaExistia: Boolean = false
)

data class PollResponse(
    val exito: Boolean = false,
    val mensajes: List<Mensaje> = emptyList()
)

data class ChatbotRequest(
    val mensaje: String,
    val historial: List<Map<String, String>> = emptyList()
)

data class ChatbotResponse(
    val exito: Boolean = false,
    val contenido: String? = null,
    val error: String? = null
)

data class DeleteMessageRequest(
    val mensaje_id: Int
)

data class GenericResponse(
    val exito: Boolean = false,
    val mensaje: String = "",
    val error: String? = null
)
