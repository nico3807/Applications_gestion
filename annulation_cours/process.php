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

// Accès réservé aux utilisateurs authentifiés (anti-abus : envoi d'emails).
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Authentification requise."]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $nom_etudiant = htmlspecialchars(trim($_POST['nom_etudiant']     ?? ''));
    $groupe       = htmlspecialchars(trim($_POST['groupe']           ?? ''));
    $groupe_cours = htmlspecialchars(trim($_POST['groupe_cours']     ?? ''));
    $enseignant   = htmlspecialchars(trim($_POST['enseignant']       ?? ''));
    $matiere      = htmlspecialchars(trim($_POST['matiere']          ?? ''));
    $date_cours   = htmlspecialchars(trim($_POST['date_cours']       ?? ''));
    $creneau      = htmlspecialchars(trim($_POST['creneau']          ?? ''));
    $type         = htmlspecialchars(trim($_POST['type_signalement'] ?? ''));
    $commentaire  = htmlspecialchars(trim($_POST['commentaire']      ?? ''));

    $date_fr = $date_cours ? date('d/m/Y', strtotime($date_cours)) : $date_cours;

    if (empty($nom_etudiant) || empty($groupe) || empty($groupe_cours) || empty($enseignant) || empty($matiere) || empty($date_cours) || empty($creneau) || empty($type)) {
        echo json_encode(["status" => "error", "message" => "Veuillez remplir tous les champs obligatoires."]);
        exit;
    }

    $recipients = ["nicolas.maurin1@umontpellier.fr"];
    $to = implode(", ", $recipients);

    $subject_raw = "[SIGNALEMENT] Cours non assure - $enseignant ($groupe) le $date_fr";
    $subject = "=?UTF-8?B?" . base64_encode($subject_raw) . "?=";

    $s = 'font-family: Arial, sans-serif; font-size: 12pt; color: #222;';
    $message  = "<div style=\"$s\">";
    $message .= "<p>Un étudiant a signalé un cours non assuré.</p>";
    $message .= "<table style=\"border-collapse:collapse; margin-bottom:8px;\">";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Enseignant</td><td><strong>$enseignant</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Parcours</td><td><strong>$groupe</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Groupe</td><td><strong>$groupe_cours</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Matière</td><td><strong>$matiere</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Date</td><td><strong>$date_fr</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Créneau</td><td><strong>$creneau</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Type</td><td><strong>$type</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Signalé par</td><td><strong>$nom_etudiant</strong></td></tr>";
    $message .= "</table>";

    if (!empty($commentaire)) {
        $message .= "<p></p><p><strong>Précisions :</strong></p><p>" . nl2br($commentaire) . "</p><p></p>";
    }

    $message .= "</div>";

    $headers  = "From: nicolas.maurin2@gmail.com\r\n";
    $headers .= "Reply-To: nicolas.maurin2@gmail.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    $mail_sent = mail($to, $subject, $message, $headers, '-f nicolas.maurin2@gmail.com');

    if ($mail_sent) {
        echo json_encode(["status" => "success", "message" => "Votre signalement a été transmis avec succès."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Erreur lors de l'envoi de l'email de notification."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Méthode non autorisée."]);
}
