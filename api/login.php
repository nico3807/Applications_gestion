<?php
session_set_cookie_params([
    'lifetime' => 28800, // 8h
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
ini_set('session.gc_maxlifetime', 28800);
session_start();
header('Content-Type: application/json; charset=utf-8');

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['login'], $body['h'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
    exit;
}

/* ── Limitation des tentatives (anti brute-force) ─────────────────────────
   5 échecs max par IP sur une fenêtre de 15 minutes, puis blocage temporaire. */
const MAX_ATTEMPTS   = 5;
const LOCKOUT_WINDOW = 15 * 60;

$attemptsFile = __DIR__ . '/data/login_attempts.json';
$ip           = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$now          = time();

function loadAttempts($file) {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?: [];
}
function saveAttempts($file, $data) {
    file_put_contents($file, json_encode($data), LOCK_EX);
}

$attempts = loadAttempts($attemptsFile);
// purge des entrées expirées
foreach ($attempts as $k => $a) {
    if ($now - $a['first'] > LOCKOUT_WINDOW) unset($attempts[$k]);
}

if (isset($attempts[$ip]) && $attempts[$ip]['count'] >= MAX_ATTEMPTS) {
    $retryAfter = LOCKOUT_WINDOW - ($now - $attempts[$ip]['first']);
    http_response_code(429);
    header('Retry-After: ' . max(1, $retryAfter));
    echo json_encode([
        'success' => false,
        'error'   => 'Trop de tentatives. Réessayez dans ' . ceil($retryAfter / 60) . ' minute(s).',
    ]);
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
    if (isset($attempts[$ip])) {
        $attempts[$ip]['count']++;
    } else {
        $attempts[$ip] = ['count' => 1, 'first' => $now];
    }
    saveAttempts($attemptsFile, $attempts);

    http_response_code(401);
    echo json_encode(['success' => false]);
    exit;
}

// Connexion réussie : on efface le compteur d'échecs de cette IP
unset($attempts[$ip]);
saveAttempts($attemptsFile, $attempts);

$_SESSION['user'] = [
    'login'          => $user['login'],
    'rw'             => !empty($user['rw']),
    'rwApps'         => $user['rwApps']      ?? [],
    'denyApps'       => $user['denyApps']    ?? [],
    'maquetteGroups' => $user['maquetteGroups'] ?? [],
    'visibleApps'    => $user['visibleApps'] ?? [],
];

echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
