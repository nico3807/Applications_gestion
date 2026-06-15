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

// Relit les droits depuis users.json pour avoir les permissions toujours à jour
$login     = $_SESSION['user']['login'];
$usersFile = __DIR__ . '/data/users.json';
$userData  = $_SESSION['user']; // fallback si fichier absent

if (file_exists($usersFile)) {
    $users = json_decode(file_get_contents($usersFile), true) ?: [];
    foreach ($users as $u) {
        if ($u['login'] === $login) {
            $userData = [
                'login'          => $u['login'],
                'rw'             => !empty($u['rw']),
                'rwApps'         => $u['rwApps']         ?? [],
                'denyApps'       => $u['denyApps']       ?? [],
                'maquetteGroups' => $u['maquetteGroups'] ?? [],
                'visibleApps'    => $u['visibleApps']    ?? [],
            ];
            break;
        }
    }
}

echo json_encode(array_merge(['authenticated' => true], $userData));
