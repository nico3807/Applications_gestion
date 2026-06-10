<?php
/**
 * Script one-shot : crée (ou met à jour) les comptes MMI1, MMI2, MMI3.
 * À exécuter UNE SEULE FOIS depuis le serveur, puis supprimer.
 *   php /var/www/applications_gestion/api/setup-mmi-users.php
 *
 * Changez les mots de passe ci-dessous avant d'exécuter.
 */

$MMI_USERS = [
    ['login' => 'mmi1', 'password' => 'mmi1'],
    ['login' => 'mmi2', 'password' => 'mmi2'],
    ['login' => 'mmi3', 'password' => 'mmi3'],
];

$usersFile = __DIR__ . '/data/users.json';
$users = file_exists($usersFile)
    ? (json_decode(file_get_contents($usersFile), true) ?: [])
    : [];

foreach ($MMI_USERS as $def) {
    $login = strtolower(trim($def['login']));
    $h     = password_hash(hash('sha256', $def['password']), PASSWORD_DEFAULT);

    $idx = null;
    foreach ($users as $i => $u) {
        if ($u['login'] === $login) { $idx = $i; break; }
    }

    $entry = [
        'login'         => $login,
        'h'             => $h,
        'rw'            => false,
        'rwApps'        => [],
        'denyApps'      => ['repartition', 'planning-web'],
        'maquetteGroups'=> [],
        'fixedPassword' => true,
    ];

    if ($idx !== null) {
        $users[$idx] = $entry;
        echo "Mis à jour : $login\n";
    } else {
        $users[] = $entry;
        echo "Créé : $login\n";
    }
}

file_put_contents($usersFile, json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
echo "Fait. Supprimez ce fichier : rm " . __FILE__ . "\n";
