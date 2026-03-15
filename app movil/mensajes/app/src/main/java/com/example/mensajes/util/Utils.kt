package com.example.mensajes.util

import android.content.Context
import android.graphics.Color
import android.widget.ImageView
import android.widget.Toast
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CircleCrop
import com.example.mensajes.api.ApiClient
import java.text.SimpleDateFormat
import java.util.*

object Utils {

    fun toast(context: Context, msg: String) {
        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
    }

    fun getInitial(name: String?): String {
        if (name.isNullOrBlank()) return "?"
        return name.trim().first().uppercase()
    }

    fun getAvatarColor(id: Int): Int {
        val colors = intArrayOf(
            Color.parseColor("#0288D1"),
            Color.parseColor("#7B1FA2"),
            Color.parseColor("#C62828"),
            Color.parseColor("#00838F"),
            Color.parseColor("#AD1457"),
            Color.parseColor("#4527A0"),
            Color.parseColor("#1565C0"),
            Color.parseColor("#2E7D32"),
            Color.parseColor("#EF6C00"),
            Color.parseColor("#283593")
        )
        return colors[id % colors.size]
    }

    fun loadAvatar(context: Context, avatarPath: String?, imageView: ImageView) {
        if (!avatarPath.isNullOrBlank()) {
            val url = ApiClient.getFullUrl(context, avatarPath)
            Glide.with(context)
                .load(url)
                .transform(CircleCrop())
                .into(imageView)
            imageView.visibility = android.view.View.VISIBLE
        } else {
            imageView.visibility = android.view.View.GONE
        }
    }

    fun formatTime(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return ""
        return try {
            val formats = arrayOf(
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            )
            var date: Date? = null
            for (fmt in formats) {
                try {
                    val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                    date = sdf.parse(dateStr)
                    if (date != null) break
                } catch (_: Exception) {}
            }
            if (date == null) return dateStr

            val now = Calendar.getInstance()
            val cal = Calendar.getInstance().apply { time = date }

            if (now.get(Calendar.DAY_OF_YEAR) == cal.get(Calendar.DAY_OF_YEAR) &&
                now.get(Calendar.YEAR) == cal.get(Calendar.YEAR)
            ) {
                SimpleDateFormat("hh:mm a", Locale.getDefault()).format(date)
            } else {
                SimpleDateFormat("dd/MM hh:mm a", Locale.getDefault()).format(date)
            }
        } catch (_: Exception) {
            dateStr
        }
    }

    fun formatMsgTime(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return ""
        return try {
            val formats = arrayOf(
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss"
            )
            var date: Date? = null
            for (fmt in formats) {
                try {
                    date = SimpleDateFormat(fmt, Locale.getDefault()).parse(dateStr)
                    if (date != null) break
                } catch (_: Exception) {}
            }
            if (date != null) SimpleDateFormat("hh:mm a", Locale.getDefault()).format(date)
            else dateStr
        } catch (_: Exception) { dateStr }
    }

    fun formatFileSize(bytes: Long?): String {
        if (bytes == null || bytes <= 0) return ""
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> String.format("%.1f KB", bytes / 1024.0)
            else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
        }
    }
}
