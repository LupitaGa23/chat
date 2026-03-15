<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatPageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;

Route::get('/', [ChatPageController::class, 'index']);

// API (con sesión web)
Route::match(['GET','POST'], '/api/auth', [AuthController::class, 'handle']);
Route::match(['GET','POST'], '/api/chat', [ChatController::class, 'handle']);

Route::get('/health', fn () => response()->json(['ok' => true]));
