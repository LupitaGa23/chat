<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ChatPageController extends Controller
{
    public function index(Request $request)
    {
        return view('chat');
    }
}
