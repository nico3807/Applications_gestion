<?php
session_set_cookie_params([
    'lifetime' => 28800,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
ini_set('session.gc_maxlifetime', 28800);
session_start();
header('Content-Type: application/json; charset=utf-8');

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['login'], $body['currentH'], $body['newH'])) {
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

$idx  = null;
$user = null;
foreach ($users as $i => $u) {
    if ($u['login'] === $login) { $idx = $i; $user = $u; break; }
}

if ($user === null || !password_verify($body['currentH'], $user['h'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Identifiant ou mot de passe actuel incorrect']);
    exit;
}

if (!empty($user['fixedPassword'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Le mot de passe de ce compte ne peut pas être modifié.']);
    exit;
}

$users[$idx]['h'] = password_hash($body['newH'], PASSWORD_DEFAULT);

if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Impossible d\'écrire le fichier']);
    exit;
}

echo json_encode(['success' => true]);
