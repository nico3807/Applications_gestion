<?php
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $nom_etudiant  = htmlspecialchars(trim($_POST['nom_etudiant']  ?? ''));
    $salle         = htmlspecialchars(trim($_POST['salle']         ?? ''));
    $type_materiel = htmlspecialchars(trim($_POST['type_materiel'] ?? ''));
    $defaut        = htmlspecialchars(trim($_POST['defaut']        ?? ''));

    if (empty($nom_etudiant) || empty($salle) || empty($type_materiel) || empty($defaut)) {
        echo json_encode(["status" => "error", "message" => "Veuillez remplir tous les champs obligatoires."]);
        exit;
    }

    $recipients = ["nicolas.maurin1@umontpellier.fr"];
    $to = implode(", ", $recipients);

    $subject_raw = "[MATERIEL] Probleme signale - $type_materiel en $salle par $nom_etudiant";
    $subject = "=?UTF-8?B?" . base64_encode($subject_raw) . "?=";

    $s = 'font-family: Arial, sans-serif; font-size: 12pt; color: #222;';
    $message  = "<div style=\"$s\">";
    $message .= "<p>Un étudiant a signalé un problème matériel.</p>";
    $message .= "<table style=\"border-collapse:collapse; margin-bottom:8px;\">";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Signalé par</td><td><strong>$nom_etudiant</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Salle</td><td><strong>$salle</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Type de matériel</td><td><strong>$type_materiel</strong></td></tr>";
    $message .= "</table>";
    $message .= "<p></p><p><strong>Défaut constaté :</strong></p><p>" . nl2br($defaut) . "</p><p></p>";
    $message .= "</div>";

    $headers  = "From: nicolas.maurin2@gmail.com\r\n";
    $headers .= "Reply-To: nicolas.maurin2@gmail.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    $mail_sent = mail($to, $subject, $message, $headers, '-f nicolas.maurin2@gmail.com');

    if ($mail_sent) {
        echo json_encode(["status" => "success", "message" => "Votre déclaration a été transmise avec succès."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Erreur lors de l'envoi de l'email de notification."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Méthode non autorisée."]);
}
