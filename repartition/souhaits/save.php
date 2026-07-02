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

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}

// Plafond de taille du corps (anti-DoS disque) : 256 Ko largement suffisant
// pour des souhaits.
$raw = file_get_contents('php://input', false, null, 0, 256 * 1024 + 1);
if (strlen($raw) > 256 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Données trop volumineuses']);
    exit;
}

// Lecture du corps JSON
$body = json_decode($raw, true);

if (!$body || !isset($body['login']) || !isset($body['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Paramètres manquants (login, data)']);
    exit;
}

// data doit être une structure JSON (objet ou tableau), pas une valeur scalaire
if (!is_array($body['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Format de données invalide']);
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
