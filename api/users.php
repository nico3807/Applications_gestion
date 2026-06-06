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
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}

$isAdmin   = $_SESSION['user']['login'] === 'nicolas.maurin';
$usersFile = __DIR__ . '/data/users.json';
$method    = $_SERVER['REQUEST_METHOD'];

function loadUsers($file) {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?: [];
}
function saveUsers($file, $users) {
    return file_put_contents($file, json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false;
}

// GET — liste des utilisateurs (sans les hachages)
if ($method === 'GET') {
    $users = loadUsers($usersFile);
    $safe  = array_map(function ($u) { unset($u['h']); return $u; }, $users);
    echo json_encode(array_values($safe));
    exit;
}

// Écriture réservée à l'admin
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès réservé à l\'administrateur']);
    exit;
}

// POST — créer ou mettre à jour un utilisateur
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body || !isset($body['login'])) {
        http_response_code(400);
        echo json_encode(['error' => 'login requis']);
        exit;
    }
    $users    = loadUsers($usersFile);
    $login    = strtolower(trim($body['login']));
    $idx      = null;
    foreach ($users as $i => $u) {
        if ($u['login'] === $login) { $idx = $i; break; }
    }
    $existing        = $idx !== null ? $users[$idx] : ['login' => $login];
    $updated         = array_merge($existing, $body);
    $updated['login'] = $login;
    if ($idx !== null) $users[$idx] = $updated;
    else               $users[]     = $updated;
    saveUsers($usersFile, $users);
    echo json_encode(['success' => true]);
    exit;
}

// DELETE — supprimer un utilisateur
if ($method === 'DELETE') {
    $login = $_GET['login'] ?? null;
    if (!$login) {
        http_response_code(400);
        echo json_encode(['error' => 'login requis']);
        exit;
    }
    $users = loadUsers($usersFile);
    $users = array_filter($users, fn($u) => $u['login'] !== $login);
    saveUsers($usersFile, $users);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);
