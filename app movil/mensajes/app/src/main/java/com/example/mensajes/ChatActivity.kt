package com.example.mensajes

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.mensajes.adapter.MensajeAdapter
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.ChatbotRequest
import com.example.mensajes.model.DeleteMessageRequest
import com.example.mensajes.model.Mensaje
import com.example.mensajes.util.Utils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ChatActivity : AppCompatActivity() {

    private lateinit var rvMessages: RecyclerView
    private lateinit var etMessage: EditText
    private lateinit var btnSend: ImageButton
    private lateinit var btnMic: ImageButton
    private lateinit var btnAttach: ImageButton
    private lateinit var recordingBar: LinearLayout
    private lateinit var adapter: MensajeAdapter

    private var convId = 0
    private var isChatbot = false
    private var isRecording = false
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var pollJob: Job? = null
    private val handler = Handler(Looper.getMainLooper())
    private val chatbotHistory = mutableListOf<Map<String, String>>()

    companion object {
        private const val RC_FILE = 100
        private const val RC_AUDIO_PERM = 101
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        convId = intent.getIntExtra("conv_id", 0)
        isChatbot = intent.getBooleanExtra("is_chatbot", false)
        val nombre = intent.getStringExtra("nombre") ?: "Chat"
        val estado = intent.getStringExtra("estado") ?: "desconectado"
        val avatar = intent.getStringExtra("avatar")

        rvMessages = findViewById(R.id.rvMessages)
        etMessage = findViewById(R.id.etMessage)
        btnSend = findViewById(R.id.btnSend)
        btnMic = findViewById(R.id.btnMic)
        btnAttach = findViewById(R.id.btnAttach)
        recordingBar = findViewById(R.id.recordingBar)

        findViewById<TextView>(R.id.tvChatName).text = nombre
        findViewById<TextView>(R.id.tvChatStatus).text =
            if (isChatbot) {
                "Bot IA · Siempre activo"
            } else {
                if (estado == "conectado") "Conectado" else "Desconectado"
            }

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }

        val tvInitial = findViewById<TextView>(R.id.tvHeaderInitial)
        val ivAvatar = findViewById<ImageView>(R.id.ivHeaderAvatar)
        val dotOnline = findViewById<View>(R.id.dotOnline)

        tvInitial.text = if (isChatbot) "🤖" else Utils.getInitial(nombre)
        Utils.loadAvatar(this, avatar, ivAvatar)
        dotOnline.visibility = if (!isChatbot && estado == "conectado") View.VISIBLE else View.GONE

        adapter = MensajeAdapter(this, mutableListOf()) { msg ->
            showDeleteDialog(msg.id)
        }

        val lm = LinearLayoutManager(this)
        lm.stackFromEnd = true
        rvMessages.layoutManager = lm
        rvMessages.adapter = adapter

        if (isChatbot) {
            btnMic.visibility = View.GONE
            btnAttach.visibility = View.GONE
            etMessage.hint = "Pregúntale algo al bot..."
        }

        btnSend.setOnClickListener { sendMessage() }

        etMessage.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendMessage()
                true
            } else {
                false
            }
        }

        btnAttach.setOnClickListener { pickFile() }
        btnMic.setOnClickListener { toggleRecording() }

        if (isChatbot) {
            showChatbotWelcome()
        } else if (convId > 0) {
            loadMessages()
            startPolling()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        pollJob?.cancel()
        adapter.release()
        stopRecording(send = false)
    }

    private fun loadMessages() {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ChatActivity).getMessages(convId)
                if (resp.isSuccessful) {
                    adapter.updateData(resp.body() ?: emptyList())
                    scrollToBottom()
                }
            } catch (_: Exception) {
                Utils.toast(this@ChatActivity, "Error al cargar mensajes")
            }
        }
    }

    private fun sendMessage() {
        val text = etMessage.text.toString().trim()
        if (text.isBlank()) return

        if (isChatbot) {
            etMessage.text.clear()
            sendToChatbot(text)
            return
        }

        if (convId <= 0) {
            Utils.toast(this, "Conversación inválida")
            return
        }

        lifecycleScope.launch {
            try {
                val body = mapOf<String, Any>(
                    "conversacion_id" to convId,
                    "contenido" to text,
                    "tipo" to "texto"
                )

                val resp = ApiClient.getService(this@ChatActivity).sendTextMessage(body)

                if (resp.isSuccessful && resp.body()?.exito == true) {
                    etMessage.text.clear()
                    loadMessages()
                } else {
                    val errorText = try {
                        resp.errorBody()?.string()
                    } catch (_: Exception) {
                        null
                    }

                    val serverMsg = resp.body()?.error
                        ?: errorText
                        ?: "Error al enviar (${resp.code()})"

                    Utils.toast(this@ChatActivity, serverMsg)
                }
            } catch (e: Exception) {
                Utils.toast(this@ChatActivity, "Error al enviar: ${e.message ?: "desconocido"}")
            }
        }
    }

    private fun sendToChatbot(text: String) {
        val userMsg = Mensaje(
            id = adapter.getLastId() + 1,
            contenido = text,
            tipoMensaje = "texto",
            esMio = true,
            fechaEnvio = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        )

        adapter.addMessages(listOf(userMsg))
        scrollToBottom()

        chatbotHistory.add(mapOf("role" to "user", "content" to text))

        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ChatActivity)
                    .chatbotDirect(ChatbotRequest(text, chatbotHistory))

                val body = resp.body()

                if (resp.isSuccessful && body?.exito == true) {
                    val botText = body.contenido ?: "Sin respuesta"

                    chatbotHistory.add(mapOf("role" to "model", "content" to botText))

                    val botMsg = Mensaje(
                        id = adapter.getLastId() + 1,
                        contenido = botText,
                        tipoMensaje = "chatbot",
                        remitenteNombre = "Chucho Bot",
                        esMio = false,
                        fechaEnvio = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
                    )

                    adapter.addMessages(listOf(botMsg))
                    scrollToBottom()
                } else {
                    Utils.toast(this@ChatActivity, body?.error ?: "Error del bot")
                }
            } catch (e: Exception) {
                Utils.toast(this@ChatActivity, "Error: ${e.message ?: "desconocido"}")
            }
        }
    }

    private fun showChatbotWelcome() {
        if (adapter.itemCount > 0) return

        val welcomeText = "¡Hola! 👋 Soy Chucho Bot, tu asistente con IA. Pregúntame lo que quieras y te ayudaré."

        val welcome = Mensaje(
            id = 1,
            contenido = welcomeText,
            tipoMensaje = "chatbot",
            remitenteNombre = "Chucho Bot",
            esMio = false,
            fechaEnvio = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        )

        adapter.updateData(listOf(welcome))
        chatbotHistory.clear()
        chatbotHistory.add(mapOf("role" to "model", "content" to welcomeText))
        scrollToBottom()
    }

    private fun pickFile() {
        val intent = Intent(Intent.ACTION_GET_CONTENT)
        intent.type = "*/*"
        intent.addCategory(Intent.CATEGORY_OPENABLE)
        startActivityForResult(Intent.createChooser(intent, "Seleccionar archivo"), RC_FILE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_FILE && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                sendFile(uri)
            }
        }
    }

    private fun sendFile(uri: Uri) {
        if (convId <= 0) return

        lifecycleScope.launch {
            try {
                val inputStream = contentResolver.openInputStream(uri) ?: return@launch
                val fileName = getFileName(uri) ?: "archivo"
                val tempFile = File(cacheDir, fileName)

                tempFile.outputStream().use { out ->
                    inputStream.copyTo(out)
                }

                val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
                val requestFile = tempFile.asRequestBody(mimeType.toMediaType())
                val filePart = MultipartBody.Part.createFormData("archivo", fileName, requestFile)

                val tipo = if (mimeType.startsWith("image/")) "imagen" else "documento"
                val convIdBody = convId.toString().toRequestBody("text/plain".toMediaType())
                val contenidoBody = fileName.toRequestBody("text/plain".toMediaType())
                val tipoBody = tipo.toRequestBody("text/plain".toMediaType())

                val resp = ApiClient.getService(this@ChatActivity)
                    .sendMessage(convIdBody, contenidoBody, tipoBody, filePart)

                if (resp.isSuccessful && resp.body()?.exito == true) {
                    Utils.toast(this@ChatActivity, "Archivo enviado")
                    loadMessages()
                } else {
                    Utils.toast(this@ChatActivity, resp.body()?.error ?: "Error al enviar")
                }

                tempFile.delete()
            } catch (e: Exception) {
                Utils.toast(this@ChatActivity, "Error: ${e.message ?: "desconocido"}")
            }
        }
    }

    private fun getFileName(uri: Uri): String? {
        var name: String? = null

        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                name = cursor.getString(idx)
            }
        }

        return name
    }

    private fun toggleRecording() {
        if (isRecording) {
            stopRecording(send = true)
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.RECORD_AUDIO),
                    RC_AUDIO_PERM
                )
                return
            }

            startRecording()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode == RC_AUDIO_PERM &&
            grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {
            startRecording()
        } else {
            Utils.toast(this, "Se necesita permiso de micrófono")
        }
    }

    private fun startRecording() {
        try {
            audioFile = File(cacheDir, "audio_${System.currentTimeMillis()}.m4a")

            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(audioFile!!.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            recordingBar.visibility = View.VISIBLE
            btnMic.setColorFilter(getColor(R.color.error))
        } catch (e: Exception) {
            Utils.toast(this, "Error al grabar: ${e.message ?: "desconocido"}")
            isRecording = false
        }
    }

    private fun stopRecording(send: Boolean) {
        if (!isRecording) return

        try {
            mediaRecorder?.stop()
            mediaRecorder?.release()
        } catch (_: Exception) {
        }

        mediaRecorder = null
        isRecording = false
        recordingBar.visibility = View.GONE
        btnMic.clearColorFilter()

        if (send && audioFile != null && audioFile!!.exists() && convId > 0) {
            sendAudioFile(audioFile!!)
        }
    }

    private fun sendAudioFile(file: File) {
        lifecycleScope.launch {
            try {
                val requestFile = file.asRequestBody("audio/mp4".toMediaType())
                val filePart = MultipartBody.Part.createFormData("archivo", file.name, requestFile)
                val convIdBody = convId.toString().toRequestBody("text/plain".toMediaType())
                val contenidoBody = "🎤 Nota de voz".toRequestBody("text/plain".toMediaType())
                val tipoBody = "audio".toRequestBody("text/plain".toMediaType())

                val resp = ApiClient.getService(this@ChatActivity)
                    .sendMessage(convIdBody, contenidoBody, tipoBody, filePart)

                if (resp.isSuccessful && resp.body()?.exito == true) {
                    Utils.toast(this@ChatActivity, "Nota de voz enviada")
                    loadMessages()
                } else {
                    Utils.toast(this@ChatActivity, resp.body()?.error ?: "Error al enviar audio")
                }

                file.delete()
            } catch (e: Exception) {
                Utils.toast(this@ChatActivity, "Error: ${e.message ?: "desconocido"}")
            }
        }
    }

    private fun startPolling() {
        pollJob = lifecycleScope.launch(Dispatchers.IO) {
            while (isActive) {
                try {
                    val lastId = adapter.getLastId()
                    val resp = ApiClient.getService(this@ChatActivity).poll(convId, lastId)

                    if (resp.isSuccessful) {
                        val msgs = resp.body()?.mensajes ?: emptyList()
                        if (msgs.isNotEmpty()) {
                            withContext(Dispatchers.Main) {
                                adapter.addMessages(msgs)
                                scrollToBottom()
                            }
                        }
                    }

                    delay(1500)
                } catch (_: Exception) {
                    delay(3000)
                }
            }
        }
    }

    private fun showDeleteDialog(msgId: Int) {
        AlertDialog.Builder(this)
            .setTitle("Eliminar mensaje")
            .setMessage("¿Seguro que quieres eliminar este mensaje?")
            .setPositiveButton("Eliminar") { _, _ ->
                deleteMessage(msgId)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun deleteMessage(msgId: Int) {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ChatActivity)
                    .deleteMessage(DeleteMessageRequest(msgId))

                if (resp.isSuccessful && resp.body()?.exito == true) {
                    Utils.toast(this@ChatActivity, "Mensaje eliminado")
                    loadMessages()
                }
            } catch (e: Exception) {
                Utils.toast(this@ChatActivity, "Error: ${e.message ?: "desconocido"}")
            }
        }
    }

    private fun scrollToBottom() {
        handler.postDelayed({
            if (adapter.itemCount > 0) {
                rvMessages.smoothScrollToPosition(adapter.itemCount - 1)
            }
        }, 100)
    }
}
