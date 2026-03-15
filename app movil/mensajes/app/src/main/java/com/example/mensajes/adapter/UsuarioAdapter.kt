package com.example.mensajes.adapter

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.mensajes.R
import com.example.mensajes.model.Usuario
import com.example.mensajes.util.Utils

class UsuarioAdapter(
    private val context: Context,
    private var items: List<Usuario>,
    private val onClick: (Usuario) -> Unit
) : RecyclerView.Adapter<UsuarioAdapter.VH>() {

    private var filteredItems: List<Usuario> = items

    fun updateData(newItems: List<Usuario>) {
        items = newItems
        filteredItems = newItems
        notifyDataSetChanged()
    }

    fun filter(query: String) {
        filteredItems = if (query.isBlank()) items
        else items.filter {
            val full = "${it.nombre} ${it.apellidoPaterno ?: ""} ${it.correo}"
            full.contains(query, ignoreCase = true)
        }
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(context).inflate(R.layout.item_user, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val u = filteredItems[position]
        val nombre = "${u.nombre} ${u.apellidoPaterno ?: ""}".trim()

        holder.tvName.text = nombre
        holder.tvEmail.text = u.correo

        holder.tvInitial.text = Utils.getInitial(nombre)
        val bg = holder.tvInitial.background as? GradientDrawable
        bg?.setColor(Utils.getAvatarColor(u.id))

        Utils.loadAvatar(context, u.avatar, holder.ivAvatar)

        holder.dotOnline.visibility = if (u.estadoConexion == "conectado") View.VISIBLE else View.GONE

        holder.itemView.setOnClickListener { onClick(u) }
    }

    override fun getItemCount() = filteredItems.size

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvInitial: TextView = v.findViewById(R.id.tvInitial)
        val ivAvatar: ImageView = v.findViewById(R.id.ivAvatar)
        val dotOnline: View = v.findViewById(R.id.dotOnline)
        val tvName: TextView = v.findViewById(R.id.tvName)
        val tvEmail: TextView = v.findViewById(R.id.tvEmail)
    }
}
