package com.example.mensajes.adapter

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.mensajes.R
import com.example.mensajes.model.Conversacion
import com.example.mensajes.util.Utils

class ConversacionAdapter(
    private val context: Context,
    private var items: List<Conversacion>,
    private val onClick: (Conversacion) -> Unit
) : RecyclerView.Adapter<ConversacionAdapter.VH>() {

    fun updateData(newItems: List<Conversacion>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(context).inflate(R.layout.item_conversation, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val c = items[position]
        val nombre = c.nombreCompleto ?: c.nombreDisplay ?: "Chat"

        holder.tvName.text = nombre
        holder.tvLastMessage.text = when {
            c.ultimoTipoMensaje == "audio" -> "🎤 Nota de voz"
            !c.ultimoMensaje.isNullOrBlank() -> c.ultimoMensaje
            else -> "Sin mensajes"
        }
        holder.tvTime.text = Utils.formatTime(c.ultimaFecha ?: c.fechaActualizacion)

        // Avatar
        holder.tvInitial.text = Utils.getInitial(nombre)
        val bg = holder.tvInitial.background as? GradientDrawable
        bg?.setColor(Utils.getAvatarColor(c.id))

        Utils.loadAvatar(context, c.avatarDisplay, holder.ivAvatar)

        // Online dot
        holder.dotOnline.visibility = if (c.estadoConexion == "conectado") View.VISIBLE else View.GONE

        // Badge
        if (c.noLeidos > 0) {
            holder.tvBadge.visibility = View.VISIBLE
            holder.tvBadge.text = c.noLeidos.toString()
        } else {
            holder.tvBadge.visibility = View.GONE
        }

        holder.itemView.setOnClickListener { onClick(c) }
    }

    override fun getItemCount() = items.size

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvInitial: TextView = v.findViewById(R.id.tvInitial)
        val ivAvatar: ImageView = v.findViewById(R.id.ivAvatar)
        val dotOnline: View = v.findViewById(R.id.dotOnline)
        val tvName: TextView = v.findViewById(R.id.tvName)
        val tvLastMessage: TextView = v.findViewById(R.id.tvLastMessage)
        val tvTime: TextView = v.findViewById(R.id.tvTime)
        val tvBadge: TextView = v.findViewById(R.id.tvBadge)
    }
}
