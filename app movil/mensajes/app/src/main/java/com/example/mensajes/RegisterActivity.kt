package com.example.mensajes

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.RegisterRequest
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        val etNombre = findViewById<EditText>(R.id.etNombre)
        val etApellidoP = findViewById<EditText>(R.id.etApellidoP)
        val etApellidoM = findViewById<EditText>(R.id.etApellidoM)
        val etCorreo = findViewById<EditText>(R.id.etCorreo)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val etConfirm = findViewById<EditText>(R.id.etConfirm)
        val btnRegister = findViewById<Button>(R.id.btnRegister)
        val btnBack = findViewById<Button>(R.id.btnBackLogin)
        val tvMessage = findViewById<TextView>(R.id.tvMessage)
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)

        btnBack.setOnClickListener { finish() }

        btnRegister.setOnClickListener {
            val nombre = etNombre.text.toString().trim()
            val apP = etApellidoP.text.toString().trim()
            val apM = etApellidoM.text.toString().trim()
            val correo = etCorreo.text.toString().trim()
            val pass = etPassword.text.toString().trim()
            val confirm = etConfirm.text.toString().trim()

            if (nombre.isBlank() || apP.isBlank() || correo.isBlank() || pass.isBlank()) {
                tvMessage.visibility = View.VISIBLE
                tvMessage.text = "Completa los campos obligatorios"
                tvMessage.setTextColor(getColor(R.color.error))
                return@setOnClickListener
            }

            if (pass != confirm) {
                tvMessage.visibility = View.VISIBLE
                tvMessage.text = "Las contraseñas no coinciden"
                tvMessage.setTextColor(getColor(R.color.error))
                return@setOnClickListener
            }

            progressBar.visibility = View.VISIBLE
            btnRegister.isEnabled = false

            lifecycleScope.launch {
                try {
                    val resp = ApiClient.getService(this@RegisterActivity)
                        .register(RegisterRequest(nombre, apP, apM, correo, pass, confirm))

                    val body = resp.body()
                    tvMessage.visibility = View.VISIBLE

                    if (resp.isSuccessful && body != null && body.exito) {
                        tvMessage.text = body.mensaje
                        tvMessage.setTextColor(getColor(R.color.exito))

                        val intent = Intent(this@RegisterActivity, VerifyActivity::class.java)
                        intent.putExtra("correo", correo)
                        intent.putExtra("codigo_local", body.codigoLocal)
                        startActivity(intent)
                        finish()
                    } else {
                        tvMessage.text = body?.mensaje ?: "Error al registrar"
                        tvMessage.setTextColor(getColor(R.color.error))
                    }
                } catch (e: Exception) {
                    tvMessage.visibility = View.VISIBLE
                    tvMessage.text = "Error: ${e.message}"
                    tvMessage.setTextColor(getColor(R.color.error))
                } finally {
                    progressBar.visibility = View.GONE
                    btnRegister.isEnabled = true
                }
            }
        }
    }
}
