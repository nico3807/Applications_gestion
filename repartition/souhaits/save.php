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

// Lecture du corps JSON
$body = json_decode(file_get_contents('php://input'), true);

if (!$body || !isset($body['login']) || !isset($body['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Paramètres manquants (login, data)']);
    exit;
}

$login = $body['login'];

// Un utilisateur ne peut écrire que SES PROPRES souhaits
if ($login !== $_SESSION['user']['login']) {
    http_response_code(403);
    echo json_encode(['error' => 'Vous ne pouvez modifier que vos propres souhaits']);
    exit;
}

// Sanitize : uniquement lettres minuscules, chiffres, tirets, points
$login = preg_replace('/[^a-z0-9\-\.]/', '', $login);
if (!$login) {
    http_response_code(400);
    echo json_encode(['error' => 'Login invalide après sanitization']);
    exit;
}

$file = __DIR__ . '/' . $login . '.json';
$json = json_encode($body['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($file, $json, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible d\'écrire le fichier']);
    exit;
}

echo json_encode(['success' => true]);
