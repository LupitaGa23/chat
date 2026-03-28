<?php

namespace App\Services;

class CryptoService
{
    public static function method(): string
    {
        return (string) config('chucho.encryption_method', 'AES-256-CBC');
    }

    /**
     * Get a 32-byte key suitable for AES-256.
     */
    public static function key(): string
    {
        $raw = (string) config('chucho.encryption_key', 'change-me');
        // Derive a consistent 32-byte key.
        return hash('sha256', $raw, true);
    }

    /**
     * @return array{cifrado:string, iv:string}
     */
    public static function encrypt(string $plainText): array
    {
        $method = self::method();
        $ivLen = openssl_cipher_iv_length($method);
        $iv = random_bytes($ivLen);

        $cipher = openssl_encrypt($plainText, $method, self::key(), 0, $iv);
        if ($cipher === false) {
            throw new \RuntimeException('No se pudo cifrar el mensaje');
        }

        return [
            'cifrado' => $cipher,
            'iv' => base64_encode($iv),
        ];
    }

    public static function decrypt(?string $cipherText, ?string $ivB64): string
    {
        if (!$cipherText || !$ivB64) return '';
        $method = self::method();
        $iv = base64_decode($ivB64, true);
        if ($iv === false) return '';

        $plain = openssl_decrypt($cipherText, $method, self::key(), 0, $iv);
        return $plain === false ? '' : $plain;
    }
}
