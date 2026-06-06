<?php
/**
 * Script à usage UNIQUE : génère un nouveau mot de passe aléatoire fort pour
 * chaque compte de api/data/users.json, le hache correctement (SHA-256 puis
 * password_hash salé — même format que la vérification de api/login.php),
 * met à jour le fichier, et affiche un tableau récapitulatif en clair.
 *
 * À exécuter UNE SEULE FOIS sur le serveur :
 *   php /var/www/applications_gestion/api/reset-all-passwords.php > /tmp/nouveaux-mdp.txt
 *
 * Puis :
 *   1. Communiquer individuellement chaque mot de passe à son utilisateur
 *      (en main propre, par téléphone... pas par email en clair si possible)
 *   2. rm /tmp/nouveaux-mdp.txt
 *   3. rm /var/www/applications_gestion/api/reset-all-passwords.php
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

function genPassword($length = 14) {
    // Alphabet sans caractères ambigus (0/O, 1/l/I)
    $chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    $pwd = '';
    for ($i = 0; $i < $length; $i++) {
        $pwd .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $pwd;
}

$table = [];
foreach ($users as &$u) {
    if (!isset($u['login'])) continue;
    $pwd       = genPassword();
    $sha       = hash('sha256', $pwd);
    $u['h']    = password_hash($sha, PASSWORD_DEFAULT);
    $table[]   = [$u['login'], $pwd];
}
unset($u);

if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
    fwrite(STDERR, "Échec de l'écriture du fichier.\n");
    exit(1);
}

echo "Tous les mots de passe ont été régénérés et enregistrés dans users.json.\n\n";
echo str_pad("Identifiant", 22) . "| Nouveau mot de passe\n";
echo str_repeat('-', 22) . "+" . str_repeat('-', 20) . "\n";
foreach ($table as [$login, $pwd]) {
    echo str_pad($login, 22) . "| $pwd\n";
}
echo "\nIMPORTANT :\n";
echo "  1. Communiquez ces mots de passe individuellement (pas par email en clair).\n";
echo "  2. Supprimez ensuite ce fichier de sortie ET ce script :\n";
echo "       rm api/reset-all-passwords.php\n";
