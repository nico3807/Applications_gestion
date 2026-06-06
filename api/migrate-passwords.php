<?php
/**
 * Script de migration à usage unique : convertit les hashes SHA-256 bruts de
 * api/data/users.json en hashes password_hash() (Argon2id/bcrypt, salés).
 *
 * À exécuter UNE SEULE FOIS sur le serveur via :
 *   php /var/www/applications_gestion/api/migrate-passwords.php
 * puis SUPPRIMER ce fichier.
 *
 * Idempotent : les hashes déjà au format password_hash sont laissés intacts,
 * donc une seconde exécution accidentelle ne casse rien.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Ce script doit être exécuté en ligne de commande (CLI), pas via le navigateur.');
}

$usersFile = __DIR__ . '/data/users.json';
if (!file_exists($usersFile)) {
    fwrite(STDERR, "Fichier introuvable : $usersFile\n");
    exit(1);
}

$users = json_decode(file_get_contents($usersFile), true);
if (!is_array($users)) {
    fwrite(STDERR, "JSON invalide.\n");
    exit(1);
}

$converted = 0;
foreach ($users as &$u) {
    if (!isset($u['h'])) continue;
    if (preg_match('/^\$(2y|argon2id|argon2i)\$/', $u['h'])) {
        echo "  [déjà migré]   {$u['login']}\n";
        continue;
    }
    if (preg_match('/^[a-f0-9]{64}$/i', $u['h'])) {
        $u['h'] = password_hash($u['h'], PASSWORD_DEFAULT);
        echo "  [migré]        {$u['login']}\n";
        $converted++;
    } else {
        echo "  [format inconnu] {$u['login']} — ignoré\n";
    }
}
unset($u);

if ($converted > 0) {
    file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    echo "\n$converted compte(s) migré(s). Fichier mis à jour.\n";
} else {
    echo "\nAucun compte à migrer.\n";
}
echo "Vous pouvez maintenant supprimer ce script (api/migrate-passwords.php).\n";
