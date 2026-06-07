<?php
/**
 * Script à usage UNIQUE (par configuration/rotation) : enregistre le token
 * GitHub côté serveur dans api/data/github_token.json, lu ensuite par
 * api/gh-proxy.php pour relayer les appels à l'API GitHub sans jamais exposer
 * le token au navigateur.
 *
 * À exécuter sur le serveur, en saisie interactive (le token n'apparaît donc
 * jamais dans l'historique du shell ni dans la liste des process) :
 *   php /var/www/applications_gestion/api/set-github-token.php
 *
 * Puis vérifier les permissions du fichier généré :
 *   sudo chgrp www-data api/data/github_token.json
 *   sudo chmod 640 api/data/github_token.json
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Ce script doit être exécuté en ligne de commande (CLI), pas via le navigateur.');
}

fwrite(STDOUT, "Token GitHub (ghp_...) : ");

// Désactive l'écho du terminal pendant la saisie, si possible (Linux/macOS)
$sttyAvailable = false;
if (function_exists('shell_exec') && stripos(PHP_OS, 'WIN') === false) {
    $sttyAvailable = true;
    shell_exec('stty -echo');
}

$token = trim((string) fgets(STDIN));

if ($sttyAvailable) {
    shell_exec('stty echo');
    fwrite(STDOUT, "\n");
}

if ($token === '') {
    fwrite(STDERR, "Aucun token saisi, annulation.\n");
    exit(1);
}
if (!preg_match('/^gh[pousr]_[A-Za-z0-9_]+$/', $token)) {
    fwrite(STDERR, "Ce ne ressemble pas à un token GitHub valide (préfixe ghp_/gho_/ghu_/ghs_/ghr_ attendu). Annulation.\n");
    exit(1);
}

$tokenFile = __DIR__ . '/data/github_token.json';
$payload   = json_encode(['token' => $token], JSON_PRETTY_PRINT);

if (file_put_contents($tokenFile, $payload, LOCK_EX) === false) {
    fwrite(STDERR, "Échec de l'écriture du fichier $tokenFile.\n");
    exit(1);
}
chmod($tokenFile, 0640);

echo "Token enregistré dans $tokenFile\n";
echo "Vérifiez son appartenance / ses permissions :\n";
echo "  sudo chgrp www-data " . $tokenFile . "\n";
echo "  sudo chmod 640 " . $tokenFile . "\n";
