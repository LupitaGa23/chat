package com.example.mensajes.api

import android.content.Context
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    // CAMBIA ESTA LINEA CUANDO TENGAS TU DOMINIO REAL DE HOSTING
    // Ejemplo: https://tudominio.com/
    private const val DEFAULT_URL = "https://darkgray-chamois-716831.hostingersite.com/"

    private var retrofit: Retrofit? = null
    private var apiService: ApiService? = null
    private var currentBaseUrl: String = DEFAULT_URL

    private val cookieJar = object : CookieJar {
        private val cookieStore = mutableMapOf<String, MutableList<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            val hostCookies = cookieStore.getOrPut(url.host) { mutableListOf() }
            cookies.forEach { newCookie ->
                hostCookies.removeAll { it.name == newCookie.name }
                hostCookies.add(newCookie)
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            val cookies = cookieStore[url.host] ?: return emptyList()
            val validCookies = cookies.filter { it.expiresAt > System.currentTimeMillis() }
            cookieStore[url.host] = validCookies.toMutableList()
            return validCookies
        }

        fun clear() {
            cookieStore.clear()
        }
    }

    fun getBaseUrl(context: Context): String {
        return DEFAULT_URL
    }

    private fun getOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("Accept", "application/json")
                    .header("X-Requested-With", "XMLHttpRequest")
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    fun getService(context: Context): ApiService {
        val baseUrl = getBaseUrl(context)

        if (apiService == null || currentBaseUrl != baseUrl) {
            currentBaseUrl = baseUrl
            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            apiService = retrofit!!.create(ApiService::class.java)
        }

        return apiService!!
    }

    fun clearSession() {
        cookieJar.clear()
        retrofit = null
        apiService = null
    }

    fun getFullUrl(context: Context, path: String?): String {
        if (path.isNullOrBlank()) return ""

        return if (path.startsWith("http://") || path.startsWith("https://")) {
            path
        } else {
            val base = getBaseUrl(context).trimEnd('/')
            val cleanPath = if (path.startsWith("/")) path else "/$path"
            "$base$cleanPath"
        }
    }
}
