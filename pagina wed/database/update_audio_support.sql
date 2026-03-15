ALTER TABLE mensajes MODIFY COLUMN tipo_mensaje ENUM('texto', 'imagen', 'documento', 'audio', 'chatbot') DEFAULT 'texto';
ALTER TABLE historial_mensajes MODIFY COLUMN tipo_mensaje ENUM('texto', 'imagen', 'documento', 'audio', 'chatbot');
