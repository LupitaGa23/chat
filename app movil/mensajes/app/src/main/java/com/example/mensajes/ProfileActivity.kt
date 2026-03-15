package com.example.mensajes

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.PasswordChangeRequest
import com.example.mensajes.model.ProfileUpdateRequest
import com.example.mensajes.util.Utils
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class ProfileActivity : AppCompatActivity() {

    private lateinit var etNombre: EditText
    private lateinit var etApellidoP: EditText
    private lateinit var etApellidoM: EditText
    private lateinit var etUsername: EditText
    private lateinit var etCorreo: EditText
    private lateinit var etTelefono: EditText
    private lateinit var tvAvatarInitial: TextView
    private lateinit var ivAvatar: ImageView
    private lateinit var progressBar: ProgressBar

    companion object {
        private const val RC_IMAGE = 200
        private const val RC_CAMERA = 201
        private const val RC_CAMERA_PERM = 202
    }

    private var photoFile: File? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        etNombre = findViewById(R.id.etNombre)
        etApellidoP = findViewById(R.id.etApellidoP)
        etApellidoM = findViewById(R.id.etApellidoM)
        etUsername = findViewById(R.id.etUsername)
        etCorreo = findViewById(R.id.etCorreo)
        etTelefono = findViewById(R.id.etTelefono)
        tvAvatarInitial = findViewById(R.id.tvAvatarInitial)
        ivAvatar = findViewById(R.id.ivAvatar)
        progressBar = findViewById(R.id.progressBar)

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnUploadImage).setOnClickListener { pickImage() }
        findViewById<Button>(R.id.btnTakePhoto).setOnClickListener { takePhoto() }
        findViewById<Button>(R.id.btnSave).setOnClickListener { saveProfile() }
        findViewById<Button>(R.id.btnUpdatePass).setOnClickListener { changePassword() }

        loadProfile()
    }

    private fun loadProfile() {
        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ProfileActivity).profile()
                val body = resp.body()
                if (resp.isSuccessful && body?.exito == true) {
                    val u = body.usuario
                    etNombre.setText(u?.nombre?.split(" ")?.firstOrNull() ?: "")
                    etApellidoP.setText(u?.apellidoPaterno ?: "")
                    etApellidoM.setText(u?.apellidoMaterno ?: "")
                    etUsername.setText(u?.username ?: "")
                    etCorreo.setText(u?.correo ?: "")
                    etTelefono.setText(u?.telefono ?: "")
                    tvAvatarInitial.text = Utils.getInitial(u?.nombre)
                    Utils.loadAvatar(this@ProfileActivity, u?.avatar, ivAvatar)
                }
            } catch (e: Exception) {
                Utils.toast(this@ProfileActivity, "Error al cargar perfil")
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun saveProfile() {
        val req = ProfileUpdateRequest(
            nombre = etNombre.text.toString().trim(),
            apellido_paterno = etApellidoP.text.toString().trim(),
            apellido_materno = etApellidoM.text.toString().trim(),
            correo = etCorreo.text.toString().trim(),
            username = etUsername.text.toString().trim(),
            telefono = etTelefono.text.toString().trim()
        )

        if (req.nombre.isBlank() || req.apellido_paterno.isBlank() || req.correo.isBlank()) {
            Utils.toast(this, "Completa los campos obligatorios")
            return
        }

        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ProfileActivity).updateProfile(req)
                val body = resp.body()
                Utils.toast(this@ProfileActivity, body?.mensaje ?: "Error")
            } catch (e: Exception) {
                Utils.toast(this@ProfileActivity, "Error: ${e.message}")
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    private fun changePassword() {
        val currentPass = findViewById<EditText>(R.id.etCurrentPass).text.toString().trim()
        val newPass = findViewById<EditText>(R.id.etNewPass).text.toString().trim()
        val confirmPass = findViewById<EditText>(R.id.etConfirmPass).text.toString().trim()

        if (currentPass.isBlank() || newPass.isBlank() || confirmPass.isBlank()) {
            Utils.toast(this, "Completa todos los campos de contraseña")
            return
        }

        if (newPass != confirmPass) {
            Utils.toast(this, "Las contraseñas nuevas no coinciden")
            return
        }

        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@ProfileActivity)
                    .changePassword(PasswordChangeRequest(currentPass, newPass, confirmPass))
                val body = resp.body()
                Utils.toast(this@ProfileActivity, body?.mensaje ?: "Error")
                if (body?.exito == true) {
                    findViewById<EditText>(R.id.etCurrentPass).text.clear()
                    findViewById<EditText>(R.id.etNewPass).text.clear()
                    findViewById<EditText>(R.id.etConfirmPass).text.clear()
                }
            } catch (e: Exception) {
                Utils.toast(this@ProfileActivity, "Error: ${e.message}")
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }

    // ==================== AVATAR ====================

    private fun pickImage() {
        val intent = Intent(Intent.ACTION_GET_CONTENT)
        intent.type = "image/*"
        startActivityForResult(Intent.createChooser(intent, "Seleccionar imagen"), RC_IMAGE)
    }

    private fun takePhoto() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), RC_CAMERA_PERM)
            return
        }
        launchCamera()
    }

    private fun launchCamera() {
        photoFile = File(cacheDir, "photo_${System.currentTimeMillis()}.jpg")
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        // For simple approach, just launch camera and get thumbnail
        startActivityForResult(intent, RC_CAMERA)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == RC_CAMERA_PERM && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            launchCamera()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != Activity.RESULT_OK) return

        when (requestCode) {
            RC_IMAGE -> data?.data?.let { uploadAvatar(it) }
            RC_CAMERA -> {
                // Get bitmap from data (thumbnail)
                val bitmap = data?.extras?.get("data") as? android.graphics.Bitmap
                if (bitmap != null) {
                    val file = File(cacheDir, "camera_${System.currentTimeMillis()}.jpg")
                    file.outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, it) }
                    uploadAvatarFile(file)
                }
            }
        }
    }

    private fun uploadAvatar(uri: Uri) {
        lifecycleScope.launch {
            try {
                val inputStream = contentResolver.openInputStream(uri) ?: return@launch
                val tempFile = File(cacheDir, "avatar_upload.jpg")
                tempFile.outputStream().use { out -> inputStream.copyTo(out) }
                uploadAvatarFile(tempFile)
            } catch (e: Exception) {
                Utils.toast(this@ProfileActivity, "Error: ${e.message}")
            }
        }
    }

    private fun uploadAvatarFile(file: File) {
        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val requestFile = file.asRequestBody("image/jpeg".toMediaType())
                val part = MultipartBody.Part.createFormData("avatar", file.name, requestFile)
                val resp = ApiClient.getService(this@ProfileActivity).uploadAvatar(part)
                val body = resp.body()
                if (resp.isSuccessful && body?.exito == true) {
                    Utils.toast(this@ProfileActivity, "Foto actualizada")
                    Utils.loadAvatar(this@ProfileActivity, body.avatar, ivAvatar)
                } else {
                    Utils.toast(this@ProfileActivity, body?.mensaje ?: "Error al subir foto")
                }
                file.delete()
            } catch (e: Exception) {
                Utils.toast(this@ProfileActivity, "Error: ${e.message}")
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }
}
