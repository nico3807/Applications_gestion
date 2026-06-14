<?php
header('Content-Type: application/json');

// Vérification que la requête est bien en POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Récupération et nettoyage des données
    $nom = htmlspecialchars(trim($_POST['nom'] ?? ''));
    $parcours = htmlspecialchars(trim($_POST['parcours'] ?? ''));
    $date_cours = htmlspecialchars(trim($_POST['date_cours'] ?? ''));
    $heure_cours = htmlspecialchars(trim($_POST['heure_cours'] ?? ''));
    $motif = htmlspecialchars(trim($_POST['motif'] ?? ''));
    $is_urgent = isset($_POST['urgence']) ? true : false;
    $justification = htmlspecialchars(trim($_POST['justification_urgence'] ?? ''));

    if (empty($nom) || empty($parcours) || empty($date_cours) || empty($heure_cours) || empty($motif)) {
        echo json_encode(["status" => "error", "message" => "Veuillez remplir tous les champs obligatoires."]);
        exit;
    }

    // --- OPTIONNEL : Enregistrement en Base de données (MySQL/MariaDB) ---
    /*
    try {
        $pdo = new PDO('mysql:host=localhost;dbname=iut_mmi;charset=utf8', 'utilisateur', 'mot_de_passe');
        $stmt = $pdo->prepare('INSERT INTO demandes_edt (nom, parcours, date_cours, motif, urgence, justification) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nom, $parcours, $date_cours, $motif, $is_urgent ? 1 : 0, $justification]);
    } catch (Exception $e) {
        // Gérer l'erreur silencieusement ou alerter l'admin
    }
    */

    // --- CONFIGURATION DES EMAILS ---

    // Destinataires
    $recipients = ["nicolas.maurin1@umontpellier.fr"];
    // $recipients[] = "sylvie.escaig@umontpellier.fr";   // resp EDT 1
    // $recipients[] = "william.bernard@umontpellier.fr";  // resp EDT 2
    $to = implode(", ", $recipients);

    // Sujet de l'email
    $urgence_tag = $is_urgent ? "[URGENCE] " : "[STANDARD] ";
    $subject = "Guichet Unique EDT - $urgence_tag Demande de $nom ($parcours)";

    // Construction du corps du message
    $message = "Une nouvelle demande de modification d'emploi du temps a été soumise.\n\n";
    $message .= "Enseignant : $nom\n";
    $message .= "Parcours : $parcours\n";
    $message .= "Date du cours concerné : $date_cours\n";
    $message .= "Heure du cours : $heure_cours\n";
    $message .= "Motif : $motif\n";

    if ($is_urgent) {
        $message .= "\nATTENTION - DEMANDE HORS DÉLAI :\n";
        $message .= "Justification : $justification\n";
    }

    // En-têtes de l'email
    $headers = "From: nicolas.maurin2@gmail.com\r\n";
    $headers .= "Reply-To: nicolas.maurin2@gmail.com\r\n";
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
