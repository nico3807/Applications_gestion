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

$u      = $_SESSION['user'];
$method = $_SERVER['REQUEST_METHOD'];

// Lecture : ouverte à tout utilisateur authentifié (données à jour pour tous).
// Écriture : réservée aux utilisateurs ayant des droits d'écriture — ou,
// pour la maquette de répartition, aux utilisateurs disposant d'un accès
// restreint par groupe de semestres (maquetteGroups), uniquement sur les
// deux fichiers concernés.
if ($method !== 'GET') {
    $canWrite = !empty($u['rw']) || !empty($u['rwApps']);
    if (!$canWrite && !empty($u['maquetteGroups'])) {
        $maquetteFiles = [
            'repartition/maquette_overrides.json',
            'repartition/volume_horaire_national.json',
        ];
        $canWrite = in_array($_GET['path'] ?? null, $maquetteFiles, true);
    }
    if (!$canWrite) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès en écriture requis']);
        exit;
    }

    /* ── Durcissement anti-RCE ──────────────────────────────────────────────
       Ce proxy ne doit JAMAIS servir à écrire du code source ni à toucher aux
       répertoires système : chaque push sur `main` est auto-déployé sur le
       serveur (git reset --hard). Sans cette barrière, un simple compte en
       écriture pourrait pousser un webshell .php ou modifier login.php.
       On restreint donc l'écriture aux fichiers de DONNÉES (.json) des
       applications, hors des dossiers d'infrastructure. */
    $reqPath = (string) ($_GET['path'] ?? '');
    $ext     = strtolower(pathinfo($reqPath, PATHINFO_EXTENSION));
    $topDir  = strtolower(explode('/', $reqPath)[0] ?? '');
    $blockedTop = ['api', '.github', '.git'];
    if ($reqPath === '' || $reqPath[0] === '.' || $ext !== 'json' || in_array($topDir, $blockedTop, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Écriture autorisée uniquement sur les fichiers de données (.json) des applications']);
        exit;
    }
}

const GH_OWNER  = 'nico3807';
const GH_REPO   = 'Applications_gestion';
const GH_BRANCH = 'main';

$tokenFile = __DIR__ . '/data/github_token.json';
if (!file_exists($tokenFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Token GitHub non configuré sur le serveur']);
    exit;
}
$tokenData = json_decode(file_get_contents($tokenFile), true);
$token     = $tokenData['token'] ?? null;
if (!$token) {
    http_response_code(500);
    echo json_encode(['error' => 'Token GitHub non configuré sur le serveur']);
    exit;
}

/**
 * Relaie une requête vers l'API GitHub avec le token stocké côté serveur.
 * Renvoie [code HTTP, corps brut] sans jamais exposer le token au client.
 */
function ghRequest($method, $url, $token, $body = null) {
    $headers = [
        'Authorization: token ' . $token,
        'Accept: application/vnd.github.v3+json',
        'User-Agent: applications-gestion-proxy',
    ];
    $opts = [
        'method'        => $method,
        'header'        => implode("\r\n", $headers),
        'ignore_errors' => true,
    ];
    if ($body !== null) {
        $opts['header']  .= "\r\nContent-Type: application/json";
        $opts['content']  = json_encode($body);
    }
    $ctx  = stream_context_create(['http' => $opts]);
    $resp = @file_get_contents($url, false, $ctx);

    $status = 502;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m)) $status = (int) $m[1];
        }
    }
    if ($resp === false) {
        return [$status, json_encode(['error' => 'Erreur de connexion à GitHub'])];
    }
    return [$status, $resp];
}

$action = $_GET['action'] ?? null;

// Test de connexion au dépôt
if ($action === 'test') {
    [$status, $body] = ghRequest('GET', 'https://api.github.com/repos/' . GH_OWNER . '/' . GH_REPO, $token);
    http_response_code($status);
    echo $body;
    exit;
}

$path = $_GET['path'] ?? null;
if (!$path || !preg_match('#^[A-Za-z0-9_\-./]+$#', $path) || strpos($path, '..') !== false) {
    http_response_code(400);
    echo json_encode(['error' => 'Chemin invalide']);
    exit;
}

$apiUrl = 'https://api.github.com/repos/' . GH_OWNER . '/' . GH_REPO . '/contents/' . $path;

// Lecture d'un fichier (mirroir de l'API Contents de GitHub)
if ($method === 'GET') {
    $ref = $_GET['ref'] ?? GH_BRANCH;
    [$status, $body] = ghRequest('GET', $apiUrl . '?ref=' . urlencode($ref), $token);
    http_response_code($status);
    echo $body;
    exit;
}

// Écriture d'un fichier (création ou mise à jour, avec gestion du sha)
if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['message'], $input['content'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Paramètres manquants']);
        exit;
    }
    $payload = [
        'message' => $input['message'],
        'content' => $input['content'],
        'branch'  => GH_BRANCH,
    ];
    if (isset($input['sha'])) $payload['sha'] = $input['sha'];

    [$status, $body] = ghRequest('PUT', $apiUrl, $token, $payload);
    http_response_code($status);
    echo $body;
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);
