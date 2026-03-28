-- ============================================
-- CHUCHO CHAT - Base de Datos
-- MySQL / MariaDB con XAMPP
-- ============================================

CREATE DATABASE IF NOT EXISTS chucho_chat
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE chucho_chat;

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) DEFAULT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(60) DEFAULT NULL UNIQUE,
    telefono VARCHAR(30) DEFAULT NULL,
    contrasena VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    estado_conexion ENUM('conectado', 'desconectado', 'ausente') DEFAULT 'desconectado',
    ultimo_acceso DATETIME DEFAULT NULL,
    correo_verificado TINYINT(1) DEFAULT 0,
    codigo_verificacion VARCHAR(6) DEFAULT NULL,
    codigo_verificacion_expira DATETIME DEFAULT NULL,
    api_key_chatbot VARCHAR(500) DEFAULT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    INDEX idx_correo (correo),
    INDEX idx_estado (estado_conexion)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: historial_usuarios (soft delete)
-- ============================================
CREATE TABLE IF NOT EXISTS historial_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) DEFAULT NULL,
    correo VARCHAR(255) NOT NULL,
    username VARCHAR(60) DEFAULT NULL,
    telefono VARCHAR(30) DEFAULT NULL,
    contrasena VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    estado_conexion ENUM('conectado', 'desconectado', 'ausente'),
    ultimo_acceso DATETIME DEFAULT NULL,
    correo_verificado TINYINT(1) DEFAULT 0,
    fecha_creacion_original DATETIME,
    fecha_eliminacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    motivo_eliminacion VARCHAR(255) DEFAULT 'eliminado por usuario',
    eliminado_por INT DEFAULT NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('individual', 'grupo') DEFAULT 'individual',
    nombre_grupo VARCHAR(255) DEFAULT NULL,
    avatar_grupo VARCHAR(255) DEFAULT NULL,
    creador_id INT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: historial_conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS historial_conversaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversacion_id INT NOT NULL,
    tipo ENUM('individual', 'grupo'),
    nombre_grupo VARCHAR(255) DEFAULT NULL,
    creador_id INT NOT NULL,
    fecha_creacion_original DATETIME,
    fecha_eliminacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    eliminado_por INT DEFAULT NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: participantes_conversacion
-- ============================================
CREATE TABLE IF NOT EXISTS participantes_conversacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversacion_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol ENUM('admin', 'miembro') DEFAULT 'miembro',
    fecha_union DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uk_conv_user (conversacion_id, usuario_id),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: mensajes (cifrados)
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversacion_id INT NOT NULL,
    remitente_id INT NOT NULL,
    contenido_cifrado TEXT NOT NULL COMMENT 'Mensaje cifrado con AES-256-CBC',
    iv VARCHAR(64) NOT NULL COMMENT 'Vector de inicialización para descifrar',
    tipo_mensaje ENUM('texto', 'imagen', 'documento', 'audio', 'chatbot') DEFAULT 'texto',
    archivo_nombre VARCHAR(255) DEFAULT NULL,
    archivo_ruta VARCHAR(500) DEFAULT NULL,
    archivo_tamano INT DEFAULT NULL,
    leido TINYINT(1) DEFAULT 0,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    editado TINYINT(1) DEFAULT 0,
    fecha_edicion DATETIME DEFAULT NULL,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (remitente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_conversacion (conversacion_id),
    INDEX idx_remitente (remitente_id),
    INDEX idx_fecha (fecha_envio DESC)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: historial_mensajes (soft delete)
-- ============================================
CREATE TABLE IF NOT EXISTS historial_mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensaje_id INT NOT NULL,
    conversacion_id INT NOT NULL,
    remitente_id INT NOT NULL,
    contenido_cifrado TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    tipo_mensaje ENUM('texto', 'imagen', 'documento', 'audio', 'chatbot'),
    archivo_nombre VARCHAR(255) DEFAULT NULL,
    archivo_ruta VARCHAR(500) DEFAULT NULL,
    fecha_envio_original DATETIME,
    fecha_eliminacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    eliminado_por INT DEFAULT NULL,
    motivo VARCHAR(255) DEFAULT 'eliminado por usuario'
) ENGINE=InnoDB;

-- ============================================
-- TABLA: contactos
-- ============================================
CREATE TABLE IF NOT EXISTS contactos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    contacto_id INT NOT NULL,
    alias VARCHAR(100) DEFAULT NULL,
    bloqueado TINYINT(1) DEFAULT 0,
    fecha_agregado DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (contacto_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uk_contacto (usuario_id, contacto_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: historial_contactos
-- ============================================
CREATE TABLE IF NOT EXISTS historial_contactos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contacto_registro_id INT NOT NULL,
    usuario_id INT NOT NULL,
    contacto_id INT NOT NULL,
    alias VARCHAR(100) DEFAULT NULL,
    fecha_agregado_original DATETIME,
    fecha_eliminacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    eliminado_por INT DEFAULT NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: sesiones
-- ============================================
CREATE TABLE IF NOT EXISTS sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: configuracion_chatbot
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_chatbot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    api_provider ENUM('openai', 'anthropic', 'gemini', 'otro') DEFAULT 'gemini',
    api_key_cifrada TEXT DEFAULT NULL,
    api_key_iv VARCHAR(64) DEFAULT NULL,
    modelo VARCHAR(100) DEFAULT 'gemini-2.0-flash',
    temperatura DECIMAL(2,1) DEFAULT 0.7,
    max_tokens INT DEFAULT 1000,
    activo TINYINT(1) DEFAULT 1,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLA: notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('mensaje', 'contacto', 'sistema') DEFAULT 'mensaje',
    contenido VARCHAR(500) NOT NULL,
    referencia_id INT DEFAULT NULL,
    leida TINYINT(1) DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_leida (usuario_id, leida)
) ENGINE=InnoDB;
