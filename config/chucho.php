<?php

return [
    'encryption_key' => env('CHUCHO_ENCRYPTION_KEY', env('APP_KEY', 'change-me')),
    'encryption_method' => env('CHUCHO_ENCRYPTION_METHOD', 'AES-256-CBC'),

    // Chatbot (config global, sin UI)
    'chatbot_provider' => env('CHUCHO_CHATBOT_PROVIDER', 'gemini'),
    'chatbot_api_key' => env('GEMINI_API_KEY', ''),
    'chatbot_model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
    'chatbot_temperature' => (float) env('GEMINI_TEMPERATURE', 0.7),
    'chatbot_max_tokens' => (int) env('GEMINI_MAX_TOKENS', 4096),
    'chatbot_system_prompt' => env('CHUCHO_SYSTEM_PROMPT', 'Eres Chucho Bot, un asistente inteligente y amigable dentro de Chucho Chat. Responde en español de forma clara y concisa. Puedes usar emojis ocasionalmente.'),
];
