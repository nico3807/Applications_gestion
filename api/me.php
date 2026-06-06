<?php
session_set_cookie_params([
    'lifetime' => 28800,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    echo json_encode(['authenticated' => false]);
    exit;
}

echo json_encode(array_merge(['authenticated' => true], $_SESSION['user']));
