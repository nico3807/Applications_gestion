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

$VALIDATORS = ['nicolas.maurin', 'sylvie.escaig', 'william.bernard'];

$user = $_SESSION['user']['login'] ?? null;
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}

$dataFile = __DIR__ . '/data/demandes.json';

function loadDemandes(string $file): array {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?? [];
}

function saveDemandes(string $file, array $demandes): bool {
    return file_put_contents($file, json_encode(array_values($demandes), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(loadDemandes($dataFile));
    exit;
}

if ($method === 'POST') {
    if (!in_array($user, $VALIDATORS)) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $id            = $data['id']            ?? null;
    $action        = $data['action']        ?? null;
    $justification = trim($data['justification'] ?? '');

    if (!$id || !in_array($action, ['valider', 'rejeter'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Paramètres invalides']);
        exit;
    }

    if ($action === 'rejeter' && empty($justification)) {
        http_response_code(400);
        echo json_encode(['error' => 'Une justification est obligatoire pour rejeter une demande.']);
        exit;
    }

    $demandes = loadDemandes($dataFile);
    $found   = false;
    $demande = null;
    foreach ($demandes as &$d) {
        if ($d['id'] === $id) {
            if ($d['statut'] !== 'en_attente') {
                http_response_code(409);
                echo json_encode(['error' => 'Cette demande a déjà été traitée.']);
                exit;
            }
            $d['statut']                 = $action === 'valider' ? 'validee' : 'rejetee';
            $d['decision_par']           = $user;
            $d['decision_date']          = date('c');
            $d['justification_decision'] = $justification;
            $found   = true;
            $demande = $d;
            break;
        }
    }
    unset($d);

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Demande introuvable']);
        exit;
    }

    saveDemandes($dataFile, $demandes);

    // Email de notification de décision
    $statut_display = $action === 'valider' ? 'VALIDEE' : 'REJETEE';
    $nom       = htmlspecialchars($demande['nom']);
    $parcours  = htmlspecialchars($demande['parcours']);
    $ressource = htmlspecialchars($demande['ressource'] ?? '');
    $date_fr         = $demande['date_cours']    ? date('d/m/Y', strtotime($demande['date_cours']))    : '—';
    $date_souhaite_fr = $demande['date_souhaite'] ? date('d/m/Y', strtotime($demande['date_souhaite'])) : '—';
    $heure_cours      = htmlspecialchars($demande['heure_cours']    ?? '');
    $heure_souhaitee  = htmlspecialchars($demande['heure_souhaitee'] ?? '');
    $just_esc         = htmlspecialchars($justification);
    $decision_par_esc = htmlspecialchars($user);

    $subject_raw = "[EDT] Demande $statut_display - $nom ($parcours)";
    $subject = "=?UTF-8?B?" . base64_encode($subject_raw) . "?=";

    $color = $action === 'valider' ? '#16a34a' : '#dc2626';
    $s = 'font-family: Arial, sans-serif; font-size: 12pt; color: #222;';
    $msg  = "<div style=\"$s\">";
    $msg .= "<p>La demande de modification d'emploi du temps a été <strong style=\"color:$color;\">$statut_display</strong> par <strong>$decision_par_esc</strong>.</p>";
    $msg .= "<table style=\"border-collapse:collapse; margin-bottom:8px;\">";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Enseignant</td><td><strong>$nom</strong></td></tr>";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Parcours</td><td><strong>$parcours</strong></td></tr>";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Ressource / SAE</td><td><strong>$ressource</strong></td></tr>";
    $msg .= "</table>";
    $msg .= "<div style=\"border:1.5px solid #f59e0b; background:#fffbeb; border-radius:8px; padding:0.6rem 0.75rem; margin-bottom:8px;\">";
    $msg .= "<table style=\"border-collapse:collapse;\">";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Date du cours</td><td><strong>$date_fr</strong></td></tr>";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Heure du cours</td><td><strong>$heure_cours</strong></td></tr>";
    $msg .= "</table></div>";
    $msg .= "<div style=\"border:1.5px solid #6ee7b7; background:#f0fdf4; border-radius:8px; padding:0.6rem 0.75rem; margin-bottom:8px;\">";
    $msg .= "<table style=\"border-collapse:collapse;\">";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Nouvelle date</td><td><strong>$date_souhaite_fr</strong></td></tr>";
    $msg .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Nouveau créneau</td><td><strong>$heure_souhaitee</strong></td></tr>";
    $msg .= "</table></div>";
    if (!empty($just_esc)) {
        $msg .= "<p><strong>Justification de la décision :</strong></p><p>" . nl2br($just_esc) . "</p>";
    }
    $msg .= "</div>";

    $to = "nicolas.maurin1@umontpellier.fr, sylvie.escaig@umontpellier.fr, william.bernard@umontpellier.fr";
    $headers  = "From: nicolas.maurin2@gmail.com\r\n";
    $headers .= "Reply-To: nicolas.maurin2@gmail.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    mail($to, $subject, $msg, $headers, '-f nicolas.maurin2@gmail.com');

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);
