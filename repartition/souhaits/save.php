<?php
header('Content-Type: application/json; charset=utf-8');

// Lecture du corps JSON
$body = json_decode(file_get_contents('php://input'), true);

if (!$body || !isset($body['login']) || !isset($body['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Paramètres manquants (login, data)']);
    exit;
}

// Liste blanche des logins autorisés
$allowed = [
    'nicolas.maurin', 'damien.marill', 'sandy.blanco', 'william.bernard',
    'emmanuel.therond', 'luc.jaeckle', 'benoit.darties', 'sophie.de-velder',
    'davide.di-pierro', 'chrysta.pelissier', 'caroline.surribas',
    'laeticia.tournie', 'jerome.aze', 'sylvie.escaig',
];

$login = $body['login'];

if (!in_array($login, $allowed, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Login non autorisé']);
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
