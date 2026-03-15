package com.example.mensajes.api

import com.example.mensajes.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ========== AUTH ==========

    @POST("api/auth?action=login")
    suspend fun login(@Body body: LoginRequest): Response<AuthResponse>

    @POST("api/auth?action=registrar")
    suspend fun register(@Body body: RegisterRequest): Response<AuthResponse>

    @POST("api/auth?action=verificar")
    suspend fun verify(@Body body: VerifyRequest): Response<AuthResponse>

    @POST("api/auth?action=reenviar_codigo")
    suspend fun resendCode(
        @Body body: Map<String, @JvmSuppressWildcards String>
    ): Response<AuthResponse>

    @GET("api/auth?action=sesion")
    suspend fun session(): Response<SessionResponse>

    @GET("api/auth?action=perfil")
    suspend fun profile(): Response<AuthResponse>

    @POST("api/auth?action=actualizar_perfil")
    suspend fun updateProfile(@Body body: ProfileUpdateRequest): Response<AuthResponse>

    @POST("api/auth?action=cambiar_contrasena")
    suspend fun changePassword(@Body body: PasswordChangeRequest): Response<AuthResponse>

    @Multipart
    @POST("api/auth?action=subir_avatar")
    suspend fun uploadAvatar(@Part avatar: MultipartBody.Part): Response<AvatarResponse>

    @GET("api/auth?action=logout")
    suspend fun logout(): Response<GenericResponse>

    // ========== CHAT ==========

    @GET("api/chat?action=conversaciones")
    suspend fun getConversations(): Response<List<Conversacion>>

    @GET("api/chat?action=mensajes")
    suspend fun getMessages(
        @Query("conversacion_id") conversacionId: Int,
        @Query("antes_de") antesDe: String? = null
    ): Response<List<Mensaje>>

    @POST("api/chat?action=nueva_conversacion")
    suspend fun newConversation(@Body body: NewConversationRequest): Response<NewConversationResponse>

    @Multipart
    @POST("api/chat?action=enviar")
    suspend fun sendMessage(
        @Part("conversacion_id") conversacionId: RequestBody,
        @Part("contenido") contenido: RequestBody,
        @Part("tipo") tipo: RequestBody,
        @Part archivo: MultipartBody.Part? = null
    ): Response<SendMessageResponse>

    @POST("api/chat?action=enviar")
    suspend fun sendTextMessage(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<SendMessageResponse>

    @POST("api/chat?action=eliminar_mensaje")
    suspend fun deleteMessage(@Body body: DeleteMessageRequest): Response<GenericResponse>

    @GET("api/chat?action=buscar_usuarios")
    suspend fun searchUsers(@Query("q") query: String): Response<List<Usuario>>

    @GET("api/chat?action=todos_usuarios")
    suspend fun getAllUsers(): Response<List<Usuario>>

    @POST("api/chat?action=chatbot_directo")
    suspend fun chatbotDirect(@Body body: ChatbotRequest): Response<ChatbotResponse>

    @GET("api/chat?action=poll")
    suspend fun poll(
        @Query("conversacion_id") conversacionId: Int,
        @Query("ultimo_id") ultimoId: Int
    ): Response<PollResponse>
}