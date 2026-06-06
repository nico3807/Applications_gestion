<?php
session_set_cookie_params([
    'lifetime' => 28800, // 8h
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['login'], $body['h'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
    exit;
}

$usersFile = __DIR__ . '/data/users.json';
if (!file_exists($usersFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Base utilisateurs introuvable']);
    exit;
}

$users = json_decode(file_get_contents($usersFile), true) ?: [];
$login = strtolower(trim($body['login']));
$h     = $body['h'];

$user = null;
foreach ($users as $u) {
    if ($u['login'] === $login) { $user = $u; break; }
}

if (!$user || !password_verify($h, $user['h'])) {
    http_response_code(401);
    echo json_encode(['success' => false]);
    exit;
}

$_SESSION['user'] = [
    'login'    => $user['login'],
    'rw'       => !empty($user['rw']),
    'rwApps'   => $user['rwApps']   ?? [],
    'denyApps' => $user['denyApps'] ?? [],
];

echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
