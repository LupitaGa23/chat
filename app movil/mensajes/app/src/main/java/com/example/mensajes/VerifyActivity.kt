package com.example.mensajes

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.VerifyRequest
import kotlinx.coroutines.launch

class VerifyActivity : AppCompatActivity() {

    private var correo = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_verify)

        correo = intent.getStringExtra("correo") ?: ""
        val codigoLocal = intent.getStringExtra("codigo_local")

        val tvSubtitle = findViewById<TextView>(R.id.tvSubtitle)
        val etCode = findViewById<EditText>(R.id.etCode)
        val btnVerify = findViewById<Button>(R.id.btnVerify)
        val btnResend = findViewById<Button>(R.id.btnResend)
        val btnBack = findViewById<Button>(R.id.btnBackLogin)
        val tvMessage = findViewById<TextView>(R.id.tvMessage)
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)

        tvSubtitle.text = "Ingresa el código que enviamos a $correo"

        if (!codigoLocal.isNullOrBlank()) {
            tvMessage.visibility = View.VISIBLE
            tvMessage.text = "Código local: $codigoLocal"
            tvMessage.setTextColor(getColor(R.color.acento))
        }

        btnBack.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        btnVerify.setOnClickListener {
            val code = etCode.text.toString().trim().uppercase()
            if (code.isBlank()) {
                tvMessage.visibility = View.VISIBLE
                tvMessage.text = "Ingresa el código"
                tvMessage.setTextColor(getColor(R.color.error))
                return@setOnClickListener
            }

            progressBar.visibility = View.VISIBLE
            lifecycleScope.launch {
                try {
                    val resp = ApiClient.getService(this@VerifyActivity)
                        .verify(VerifyRequest(correo, code))
                    val body = resp.body()
                    tvMessage.visibility = View.VISIBLE
                    if (resp.isSuccessful && body?.exito == true) {
                        tvMessage.text = "¡Correo verificado! Ahora inicia sesión."
                        tvMessage.setTextColor(getColor(R.color.exito))
                        btnVerify.postDelayed({
                            startActivity(Intent(this@VerifyActivity, LoginActivity::class.java))
                            finish()
                        }, 1500)
                    } else {
                        tvMessage.text = body?.mensaje ?: "Código incorrecto"
                        tvMessage.setTextColor(getColor(R.color.error))
                    }
                } catch (e: Exception) {
                    tvMessage.visibility = View.VISIBLE
                    tvMessage.text = "Error: ${e.message}"
                    tvMessage.setTextColor(getColor(R.color.error))
                } finally {
                    progressBar.visibility = View.GONE
                }
            }
        }

        btnResend.setOnClickListener {
            progressBar.visibility = View.VISIBLE
            lifecycleScope.launch {
                try {
                    val resp = ApiClient.getService(this@VerifyActivity)
                        .resendCode(mapOf("correo" to correo))
                    val body = resp.body()
                    tvMessage.visibility = View.VISIBLE
                    tvMessage.text = body?.mensaje ?: "Código reenviado"
                    tvMessage.setTextColor(getColor(R.color.acento))
                } catch (e: Exception) {
                    tvMessage.visibility = View.VISIBLE
                    tvMessage.text = "Error: ${e.message}"
                    tvMessage.setTextColor(getColor(R.color.error))
                } finally {
                    progressBar.visibility = View.GONE
                }
            }
        }
    }
}
