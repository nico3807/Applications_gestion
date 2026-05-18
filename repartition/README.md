# MMI Répartition — BUT MMI Béziers 2026-27

Application Flask de gestion de la répartition des heures (CM, TD, TP) et des affectations d'enseignants par ressource, pour le BUT MMI Béziers — parcours Développement Web et Création Numérique.

---

## Prérequis

- Python 3.10 ou supérieur
- Le fichier `BUT_MMI_2025-26.xlsx` dans le même dossier que `app.py`

---

## Installation

```bash
# 1. Créer et activer l'environnement virtuel
python -m venv venv

# Windows (cmd)
venv\Scripts\activate.bat
# Windows (PowerShell)
venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Lancer l'application
python app.py
```

Ouvrir ensuite `http://localhost:5000` dans le navigateur.

---

## Structure du projet

```
repartition/
├── app.py                          ← serveur Flask (routes, logique métier)
├── requirements.txt
├── README.md
├── BUT_MMI_2025-26.xlsx            ← source des ressources et enseignants
├── data/
│   ├── affectations.json           ← affectations sauvegardées par semestre
│   ├── enseignants.json            ← liste des enseignants (source unique)
│   └── enseignants_overrides.json  ← surcharges de migration (legacy)
├── utils/
│   └── xlsx_parser.py              ← lecture du fichier XLSX
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── semestre.html
│   ├── services.html
│   ├── maquette_index.html
│   ├── maquette_semestre.html
│   ├── enseignant_ajouter.html
│   ├── enseignant_modifier.html
│   └── enseignant_supprimer.html
└── static/
    └── style.css
```

---

## Fonctionnalités

### Pages semestres (S1 → S6)

9 semestres : S1, S2, S3, S4 crea, S4 dev, S5 crea, S5 dev, S6 crea, S6 dev.

- Ressources et SAÉ chargées dynamiquement depuis le XLSX
- Sélection d'un enseignant par ressource + saisie des heures CM / TD / TP
- Lignes supplémentaires pour affecter plusieurs enseignants à la même ressource
- Steppers +/− sur chaque champ heure (pas de 1,5h)
- Sous-total et écart prévisionnel / réalisé par ressource
- Bouton **Enregistrer** → sauvegarde dans `data/affectations.json`

### Page Services

Récapitulatif des heures de chaque enseignant toutes formations confondues.

- Affichage en accordéon : seuls les noms sont visibles par défaut, un clic déploie le tableau
- Bouton **Tout déployer / Tout replier**
- Filtre par nom d'enseignant (déploiement automatique)
- Filtres **Titulaires** / **Vacataires** (titulaires affichés par défaut)
- Badges par enseignant :
  - Titulaires : **Service dû**, différentiel coloré (rouge = manque, jaune = surplus, vert = équilibre)
  - Vacataires : **Service max**, heures réalisées colorées
  - **Éq. TD** : équivalent TD calculé selon les coefficients réglementaires

### Page Maquette

Consultation et surcharge des volumes horaires de référence extraits du XLSX, semestre par semestre.

### Gestion des enseignants

Accessible depuis la barre de navigation :

- **Ajouter** un enseignant (nom, prénom, service dû, service max, statut vacataire)
- **Modifier** le service dû d'un enseignant existant
- **Supprimer** un enseignant

La liste est persistée dans `data/enseignants.json`.

---

## API

| Route                      | Méthode | Description                                 |
| -------------------------- | ------- | ------------------------------------------- |
| `/api/enseignants`         | GET     | Liste JSON de tous les enseignants          |
| `/api/affectations/<slug>` | GET     | Affectations d'un semestre (ex : `S4-crea`) |

---

## Mise en production (à venir)

Pour un déploiement sur serveur, prévoir :

- **Gunicorn** comme serveur WSGI
- **Nginx** en reverse proxy avec HTTPS (Let's Encrypt)
- **Flask-Login** + mots de passe hachés (bcrypt) pour sécuriser l'accès
- Clé secrète Flask aléatoire et longue (variable d'environnement)
