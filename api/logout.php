<?php
session_set_cookie_params(['path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
session_start();
session_destroy();
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true]);
