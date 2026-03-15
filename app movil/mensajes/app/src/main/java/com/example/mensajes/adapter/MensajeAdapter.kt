package com.example.mensajes.adapter

import android.content.Context
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.recyclerview.widget.RecyclerView
import com.example.mensajes.R
import com.example.mensajes.api.ApiClient
import com.example.mensajes.model.Mensaje
import com.example.mensajes.util.Utils

class MensajeAdapter(
    private val context: Context,
    private var items: MutableList<Mensaje>,
    private val onLongClick: (Mensaje) -> Unit = {}
) : RecyclerView.Adapter<MensajeAdapter.VH>() {

    private var mediaPlayer: MediaPlayer? = null
    private var currentPlayingId: Int = -1
    private val handler = Handler(Looper.getMainLooper())

    fun updateData(newItems: List<Mensaje>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    fun addMessages(newMsgs: List<Mensaje>) {
        for (msg in newMsgs) {
            if (items.none { it.id == msg.id }) {
                items.add(msg)
            }
        }
        notifyDataSetChanged()
    }

    fun getLastId(): Int = items.lastOrNull()?.id ?: 0

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(context).inflate(R.layout.item_message, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val msg = items[position]
        val container = holder.bubbleContainer

        val lp = container.layoutParams as FrameLayout.LayoutParams
        if (msg.esMio) {
            lp.gravity = Gravity.END
            container.setBackgroundResource(R.drawable.bg_msg_mine)
            holder.tvSender.visibility = View.GONE
        } else {
            lp.gravity = Gravity.START
            container.setBackgroundResource(R.drawable.bg_msg_other)
            holder.tvSender.visibility = View.VISIBLE
            holder.tvSender.text = msg.remitenteNombre ?: ""
        }
        container.layoutParams = lp

        holder.tvContent.visibility = View.VISIBLE
        holder.audioContainer.visibility = View.GONE
        holder.tvFileInfo.visibility = View.GONE

        when (msg.tipoMensaje ?: "texto") {
            "audio" -> {
                holder.tvContent.text = "🎤 Nota de voz"
                holder.audioContainer.visibility = View.VISIBLE
                setupAudioPlayer(holder, msg)

                if ((msg.archivoTamano ?: 0L) > 0L) {
                    holder.tvFileInfo.visibility = View.VISIBLE
                    holder.tvFileInfo.text = Utils.formatFileSize(msg.archivoTamano ?: 0L)
                }
            }

            "imagen" -> {
                holder.tvContent.text = "📷 ${msg.archivoNombre ?: "Imagen"}"
            }

            "documento" -> {
                holder.tvContent.text = "📎 ${msg.archivoNombre ?: "Archivo"}"
                if ((msg.archivoTamano ?: 0L) > 0L) {
                    holder.tvFileInfo.visibility = View.VISIBLE
                    holder.tvFileInfo.text = Utils.formatFileSize(msg.archivoTamano ?: 0L)
                }
            }

            "chatbot" -> {
                holder.tvContent.text = "🤖 ${msg.contenido ?: ""}"
            }

            else -> {
                holder.tvContent.text = msg.contenido ?: ""
            }
        }

        holder.tvTime.text = try {
            Utils.formatMsgTime(msg.fechaEnvio ?: "")
        } catch (_: Exception) {
            ""
        }

        holder.itemView.setOnLongClickListener {
            if (msg.esMio) onLongClick(msg)
            true
        }
    }

    private fun setupAudioPlayer(holder: VH, msg: Mensaje) {
        holder.btnPlayAudio.setOnClickListener {
            val url = ApiClient.getFullUrl(context, msg.archivoRuta)
            if (url.isBlank()) return@setOnClickListener

            if (currentPlayingId == msg.id && mediaPlayer?.isPlaying == true) {
                mediaPlayer?.pause()
                holder.btnPlayAudio.setImageResource(android.R.drawable.ic_media_play)
                return@setOnClickListener
            }

            stopCurrentPlayback()
            currentPlayingId = msg.id

            try {
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(url)
                    prepareAsync()
                    setOnPreparedListener { mp ->
                        mp.start()
                        holder.btnPlayAudio.setImageResource(android.R.drawable.ic_media_pause)
                        holder.seekBarAudio.max = mp.duration
                        updateSeekBar(holder, mp)
                    }
                    setOnCompletionListener {
                        holder.btnPlayAudio.setImageResource(android.R.drawable.ic_media_play)
                        holder.seekBarAudio.progress = 0
                        holder.tvAudioDuration.text = "0:00"
                        currentPlayingId = -1
                    }
                    setOnErrorListener { _, _, _ ->
                        Utils.toast(context, "Error al reproducir audio")
                        true
                    }
                }
            } catch (e: Exception) {
                Utils.toast(context, "Error: ${e.message ?: "desconocido"}")
            }
        }

        holder.seekBarAudio.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    try {
                        mediaPlayer?.seekTo(progress)
                    } catch (_: Exception) {
                    }
                }
            }
            override fun onStartTrackingTouch(sb: SeekBar?) {}
            override fun onStopTrackingTouch(sb: SeekBar?) {}
        })
    }

    private fun updateSeekBar(holder: VH, mp: MediaPlayer) {
        handler.postDelayed(object : Runnable {
            override fun run() {
                try {
                    if (mp.isPlaying) {
                        holder.seekBarAudio.progress = mp.currentPosition
                        val secs = mp.currentPosition / 1000
                        holder.tvAudioDuration.text = String.format("%d:%02d", secs / 60, secs % 60)
                        handler.postDelayed(this, 200)
                    }
                } catch (_: Exception) {
                }
            }
        }, 200)
    }

    private fun stopCurrentPlayback() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (_: Exception) {
        }
        mediaPlayer = null
        currentPlayingId = -1
    }

    fun release() {
        stopCurrentPlayback()
        handler.removeCallbacksAndMessages(null)
    }

    override fun getItemCount() = items.size

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val bubbleContainer: LinearLayout = v.findViewById(R.id.bubbleContainer)
        val tvSender: TextView = v.findViewById(R.id.tvSender)
        val tvContent: TextView = v.findViewById(R.id.tvContent)
        val audioContainer: LinearLayout = v.findViewById(R.id.audioContainer)
        val btnPlayAudio: ImageButton = v.findViewById(R.id.btnPlayAudio)
        val seekBarAudio: SeekBar = v.findViewById(R.id.seekBarAudio)
        val tvAudioDuration: TextView = v.findViewById(R.id.tvAudioDuration)
        val tvFileInfo: TextView = v.findViewById(R.id.tvFileInfo)
        val tvTime: TextView = v.findViewById(R.id.tvTime)
    }
}
