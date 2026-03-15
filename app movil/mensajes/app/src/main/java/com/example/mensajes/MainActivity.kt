package com.example.mensajes

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.mensajes.adapter.ConversacionAdapter
import com.example.mensajes.adapter.UsuarioAdapter
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.Conversacion
import com.example.mensajes.model.NewConversationRequest
import com.example.mensajes.util.Utils
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var rvConversations: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var tvEmpty: TextView
    private lateinit var tvUsername: TextView
    private lateinit var tvAvatarInitial: TextView
    private lateinit var ivAvatar: ImageView
    private lateinit var adapter: ConversacionAdapter
    private var allConversaciones = listOf<Conversacion>()
    private val handler = Handler(Looper.getMainLooper())
    private var refreshRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        rvConversations = findViewById(R.id.rvConversations)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        tvEmpty = findViewById(R.id.tvEmpty)
        tvUsername = findViewById(R.id.tvUsername)
        tvAvatarInitial = findViewById(R.id.tvAvatarInitial)
        ivAvatar = findViewById(R.id.ivAvatar)
        adapter = ConversacionAdapter(this, emptyList()) { openConversation(it) }
        rvConversations.layoutManager = LinearLayoutManager(this)
        rvConversations.adapter = adapter
        swipeRefresh.setColorSchemeColors(getColor(R.color.acento))
        swipeRefresh.setProgressBackgroundColorSchemeColor(getColor(R.color.negro_card))
        swipeRefresh.setOnRefreshListener { loadConversations() }
        findViewById<EditText>(R.id.etSearch).addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { filterConversations(s?.toString() ?: "") }
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
        })
        findViewById<ImageButton>(R.id.btnUsers).setOnClickListener { showUsersDialog() }
        findViewById<ImageButton>(R.id.btnSettings).setOnClickListener { startActivity(Intent(this, ProfileActivity::class.java)) }
        findViewById<FrameLayout>(R.id.btnProfile).setOnClickListener { startActivity(Intent(this, ProfileActivity::class.java)) }
        findViewById<ImageButton>(R.id.btnLogout).setOnClickListener { doLogout() }
        findViewById<LinearLayout>(R.id.rowChatbot).setOnClickListener { openChatbot() }
        loadSession()
        loadConversations()
        startAutoRefresh()
    }

    override fun onResume() { super.onResume(); loadConversations() }
    override fun onDestroy() { super.onDestroy(); refreshRunnable?.let { handler.removeCallbacks(it) } }

    private fun loadSession() {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@MainActivity).session()
                val body = resp.body()
                if (resp.isSuccessful && body?.autenticado == true) {
                    val u = body.usuario
                    tvUsername.text = u?.username ?: u?.nombre ?: "usuario"
                    tvAvatarInitial.text = Utils.getInitial(u?.nombre)
                    Utils.loadAvatar(this@MainActivity, u?.avatar, ivAvatar)
                } else goToLogin()
            } catch (_: Exception) { Utils.toast(this@MainActivity, "Error de conexión") }
        }
    }

    private fun loadConversations() {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.getService(this@MainActivity).getConversations()
                if (resp.isSuccessful) {
                    allConversaciones = resp.body() ?: emptyList()
                    adapter.updateData(allConversaciones)
                    tvEmpty.visibility = if (allConversaciones.isEmpty()) View.VISIBLE else View.GONE
                } else if (resp.code() == 401) goToLogin()
            } catch (_: Exception) {} finally { swipeRefresh.isRefreshing = false }
        }
    }

    private fun filterConversations(q: String) {
        if (q.isBlank()) adapter.updateData(allConversaciones)
        else adapter.updateData(allConversaciones.filter {
            val n = "${it.nombreDisplay ?: ""} ${it.nombreCompleto ?: ""}"; n.contains(q, true)
        })
    }

    private fun openConversation(c: Conversacion) {
        val i = Intent(this, ChatActivity::class.java)
        i.putExtra("conv_id", c.id); i.putExtra("nombre", c.nombreCompleto ?: c.nombreDisplay ?: "Chat")
        i.putExtra("estado", c.estadoConexion ?: "desconectado"); i.putExtra("avatar", c.avatarDisplay)
        i.putExtra("otro_usuario_id", c.otroUsuarioId ?: 0); startActivity(i)
    }

    private fun openChatbot() {
        val i = Intent(this, ChatActivity::class.java)
        i.putExtra("is_chatbot", true); i.putExtra("nombre", "Chucho Bot IA"); startActivity(i)
    }

    private fun showUsersDialog() {
        val dv = LayoutInflater.from(this).inflate(R.layout.dialog_users, null)
        val d = AlertDialog.Builder(this, R.style.Theme_Mensajes).setTitle("Usuarios Registrados").setView(dv).setNegativeButton("Cerrar", null).create()
        val rv = dv.findViewById<RecyclerView>(R.id.rvUsers)
        val et = dv.findViewById<EditText>(R.id.etFilter)
        val pb = dv.findViewById<ProgressBar>(R.id.progressBar)
        val ua = UsuarioAdapter(this, emptyList()) { u -> d.dismiss(); startConversationWith(u.id, "${u.nombre} ${u.apellidoPaterno ?: ""}".trim()) }
        rv.layoutManager = LinearLayoutManager(this); rv.adapter = ua
        pb.visibility = View.VISIBLE
        lifecycleScope.launch {
            try { val r = ApiClient.getService(this@MainActivity).getAllUsers(); if (r.isSuccessful) ua.updateData(r.body() ?: emptyList())
            } catch (_: Exception) { Utils.toast(this@MainActivity, "Error al cargar usuarios") } finally { pb.visibility = View.GONE }
        }
        et.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { ua.filter(s?.toString() ?: "") }
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
        })
        d.show(); d.window?.setBackgroundDrawableResource(R.color.negro_suave)
    }

    private fun startConversationWith(userId: Int, nombre: String) {
        lifecycleScope.launch {
            try {
                val r = ApiClient.getService(this@MainActivity).newConversation(NewConversationRequest(userId))
                val b = r.body()
                if (r.isSuccessful && b?.exito == true) {
                    val i = Intent(this@MainActivity, ChatActivity::class.java)
                    i.putExtra("conv_id", b.conversacionId); i.putExtra("nombre", nombre); i.putExtra("otro_usuario_id", userId); startActivity(i)
                } else Utils.toast(this@MainActivity, "Error al crear conversación")
            } catch (e: Exception) { Utils.toast(this@MainActivity, "Error: ${e.message}") }
        }
    }

    private fun doLogout() {
        lifecycleScope.launch { try { ApiClient.getService(this@MainActivity).logout() } catch (_: Exception) {}; ApiClient.clearSession(); goToLogin() }
    }

    private fun goToLogin() { startActivity(Intent(this, LoginActivity::class.java)); finish() }

    private fun startAutoRefresh() {
        refreshRunnable = object : Runnable { override fun run() { loadConversations(); handler.postDelayed(this, 5000) } }
        handler.postDelayed(refreshRunnable!!, 5000)
    }
}
