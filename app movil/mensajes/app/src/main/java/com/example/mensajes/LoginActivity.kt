package com.example.mensajes

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.LoginRequest
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var btnGoRegister: Button
    private lateinit var tvMessage: TextView
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        btnLogin = findViewById(R.id.btnLogin)
        btnGoRegister = findViewById(R.id.btnGoRegister)
        tvMessage = findViewById(R.id.tvMessage)
        progressBar = findViewById(R.id.progressBar)

        checkSession()

        btnLogin.setOnClickListener { doLogin() }
        btnGoRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun checkSession() {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@LoginActivity).session()
                if (resp.isSuccessful && resp.body()?.autenticado == true) {
                    goToMain()
                }
            } catch (_: Exception) {
            }
        }
    }

    private fun doLogin() {
        val email = etEmail.text.toString().trim()
        val pass = etPassword.text.toString().trim()

        if (email.isBlank() || pass.isBlank()) {
            showMessage("Completa todos los campos", true)
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@LoginActivity)
                    .login(LoginRequest(email, pass))

                val body = resp.body()
                if (resp.isSuccessful && body != null) {
                    if (body.exito) {
                        showMessage("¡Bienvenido!", false)
                        goToMain()
                    } else if (body.verificar) {
                        showMessage(body.mensaje, true)
                        val intent = Intent(this@LoginActivity, VerifyActivity::class.java)
                        intent.putExtra("correo", email)
                        startActivity(intent)
                    } else {
                        showMessage(body.mensaje, true)
                    }
                } else {
                    showMessage("Error de conexión al servidor", true)
                }
            } catch (e: Exception) {
                showMessage("Error: ${e.message}", true)
            } finally {
                setLoading(false)
            }
        }
    }

    private fun goToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun showMessage(msg: String, isError: Boolean) {
        tvMessage.visibility = View.VISIBLE
        tvMessage.text = msg
        tvMessage.setTextColor(
            if (isError) getColor(R.color.error) else getColor(R.color.exito)
        )
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnLogin.isEnabled = !loading
    }
}
