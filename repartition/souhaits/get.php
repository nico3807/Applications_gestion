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

$me  = $_SESSION['user'];
$can = !empty($me['rw']) || in_array('repartition', $me['rwApps'] ?? [], true);

$login = strtolower(trim($_GET['login'] ?? ''));
$login = preg_replace('/[^a-z0-9\-\.]/', '', $login);

if ($login === '') {
    http_response_code(400);
    echo json_encode(['error' => 'login requis']);
    exit;
}

// On ne peut consulter que ses propres souhaits, sauf si on a les droits
// d'écriture sur l'application répartition (vue "Tous les enseignants").
if ($login !== $me['login'] && !$can) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès non autorisé']);
    exit;
}

$file = __DIR__ . '/' . $login . '.json';
if (!file_exists($file)) {
    http_response_code(404);
    echo json_encode(['error' => 'Aucun souhait enregistré']);
    exit;
}

echo file_get_contents($file);
