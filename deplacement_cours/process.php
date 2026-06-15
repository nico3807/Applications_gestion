<?php
header('Content-Type: application/json');

// Vérification que la requête est bien en POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Récupération et nettoyage des données
    $nom          = htmlspecialchars(trim($_POST['nom']                  ?? ''));
    $parcours     = htmlspecialchars(trim($_POST['parcours']             ?? ''));
    $ressource    = htmlspecialchars(trim($_POST['ressource']            ?? ''));
    $date_cours   = htmlspecialchars(trim($_POST['date_cours']           ?? ''));
    $heure_cours  = htmlspecialchars(trim($_POST['heure_cours']          ?? ''));
    $motif               = htmlspecialchars(trim($_POST['motif']                  ?? ''));
    $date_souhaite       = htmlspecialchars(trim($_POST['date_cours_souhaite']    ?? ''));
    $heure_souhaitee     = htmlspecialchars(trim($_POST['heure_cours_souhaitee']  ?? ''));
    $is_urgent           = isset($_POST['urgence']);
    $justification       = htmlspecialchars(trim($_POST['justification_urgence']  ?? ''));

    // Dates au format français
    $date_fr          = $date_cours    ? date('d/m/Y', strtotime($date_cours))    : $date_cours;
    $date_souhaite_fr = $date_souhaite ? date('d/m/Y', strtotime($date_souhaite)) : $date_souhaite;

    if (empty($nom) || empty($parcours) || empty($ressource) || empty($date_cours) || empty($heure_cours) || empty($date_souhaite) || empty($heure_souhaitee) || empty($motif)) {
        echo json_encode(["status" => "error", "message" => "Veuillez remplir tous les champs obligatoires."]);
        exit;
    }

    // --- Enregistrement de la demande en JSON ---
    $demande = [
        'id'                     => uniqid("", true),
        'nom'                    => trim($_POST['nom']                   ?? ''),
        'parcours'               => trim($_POST['parcours']              ?? ''),
        'ressource'              => trim($_POST['ressource']             ?? ''),
        'date_cours'             => trim($_POST['date_cours']            ?? ''),
        'heure_cours'            => trim($_POST['heure_cours']           ?? ''),
        'motif'                  => trim($_POST['motif']                 ?? ''),
        'date_souhaite'          => trim($_POST['date_cours_souhaite']   ?? ''),
        'heure_souhaitee'        => trim($_POST['heure_cours_souhaitee'] ?? ''),
        'urgence'                => isset($_POST['urgence']),
        'justification_urgence'  => trim($_POST['justification_urgence'] ?? ''),
        'statut'                 => 'en_attente',
        'decision_par'           => null,
        'decision_date'          => null,
        'justification_decision' => null,
        'soumis_le'              => date('c'),
        'soumis_par'             => trim($_POST['soumis_par'] ?? ''),
    ];

    $dataFile = dirname(__DIR__) . '/api/data/deplacement_demandes.json';
    $existantes = file_exists($dataFile) ? (json_decode(file_get_contents($dataFile), true) ?? []) : [];
    $existantes[] = $demande;
    file_put_contents($dataFile, json_encode($existantes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

    // --- CONFIGURATION DES EMAILS ---

    // Destinataires (les 3 valideurs)
    //$to = "nicolas.maurin1@umontpellier.fr, sylvie.escaig@umontpellier.fr, william.bernard@umontpellier.fr";
    $to = "nicolas.maurin1@umontpellier.fr";

    // Sujet de l'email
    $urgence_tag = $is_urgent ? "[URGENCE] " : "";
    $subject_raw = "[EDT] {$urgence_tag}Nouvelle demande - $nom ($parcours)";
    $subject = "=?UTF-8?B?" . base64_encode($subject_raw) . "?=";

    // Construction du corps du message (HTML)
    $s = 'font-family: Arial, sans-serif; font-size: 12pt; color: #222;';
    $message  = "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"$s\">";
    $message .= "<p>Une nouvelle demande de modification d'emploi du temps a été soumise.</p>";
    $message .= "<table style=\"border-collapse:collapse; margin-bottom:8px;\">";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Enseignant</td><td><strong>$nom</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Parcours</td><td><strong>$parcours</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Ressource / SAE</td><td><strong>$ressource</strong></td></tr>";
    $message .= "</table>";

    $message .= "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1.5px solid #f59e0b; background:#fffbeb; border-radius:8px; margin-bottom:8px;\">";
    $message .= "<tr><td style=\"padding:8px 12px;\">";
    $message .= "<table cellpadding=\"0\" cellspacing=\"0\">";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Date du cours à modifier</td><td><strong>$date_fr</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Heure du cours</td><td><strong>$heure_cours</strong></td></tr>";
    $message .= "</table></td></tr></table>";

    $message .= "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1.5px solid #6ee7b7; background:#f0fdf4; border-radius:8px; margin-bottom:8px;\">";
    $message .= "<tr><td style=\"padding:8px 12px;\">";
    $message .= "<table cellpadding=\"0\" cellspacing=\"0\">";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Nouvelle date souhaitée</td><td><strong>$date_souhaite_fr</strong></td></tr>";
    $message .= "<tr><td style=\"padding:3px 16px 3px 0; color:#555;\">Nouveau créneau souhaité</td><td><strong>$heure_souhaitee</strong></td></tr>";
    $message .= "</table></td></tr></table>";
    $message .= "<p></p><p><strong>Motif :</strong></p><p>" . nl2br($motif) . "</p><p></p>";

    if ($is_urgent) {
        $message .= "<p style=\"color:#b91c1c;\"><strong>⚠️ ATTENTION — DEMANDE HORS DÉLAI</strong></p>";
        $message .= "<p></p><p><strong>Justification de l'urgence :</strong></p><p>" . nl2br($justification) . "</p><p></p>";
    }

    $message .= "</td></tr></table>";

    // En-têtes de l'email
    $headers  = "From: nicolas.maurin2@gmail.com\r\n";
    $headers .= "Reply-To: nicolas.maurin2@gmail.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Envoi de l'email via la fonction native mail()
    // Remarque : Sur un serveur Nginx de production, assurez-vous que Postfix ou Sendmail est configuré,
    // ou utilisez une librairie comme PHPMailer pour passer par un relais SMTP (recommandé pour éviter les spams).
    $mail_sent = mail($to, $subject, $message, $headers, '-f nicolas.maurin2@gmail.com');

    if ($mail_sent) {
        echo json_encode(["status" => "success", "message" => "Votre demande a été transmise avec succès à l'équipe pédagogique."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Erreur lors de l'envoi de l'email de notification."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Méthode non autorisée."]);
}
