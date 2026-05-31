# Applications Gestion — BUT MMI IUT de Béziers

Suite d'applications web de gestion pour le département MMI (Métiers du Multimédia et de l'Internet) de l'IUT de Béziers.

## Applications

| Application                                     | Description                                         | Technologie               |
| ----------------------------------------------- | --------------------------------------------------- | ------------------------- |
| [Planning MMI](planning-web/)                   | Calendrier interactif des événements pédagogiques   | HTML / CSS / JS (static)  |
| [Répartition MMI](repartition/)                 | Affectation des heures d'enseignement par ressource | Flask (Python) + openpyxl |
| [Soutenances Stages](soutenances_stages/)       | Gestion des jurys de soutenances de stage           | HTML / CSS / JS (static)  |
| [Soutenances Portfolio](soutenances_portfolio/) | Gestion des jurys de soutenances de portfolio       | HTML / CSS / JS (static)  |

La page d'accueil ([index.html](index.html)) centralise l'accès aux quatre applications.

---

## Planning MMI

Calendrier des 3 années du BUT MMI (7 semestres : MMI1, MMI2 initiaux/alternants, MMI3 initiaux/alternants,).

**Fonctionnalités**

- Vues mensuelle et annuelle
- Filtrage par promotion
- Création, modification et suppression d'événements
- Gris automatique des jours fériés et vacances
- Semaines complètes pour SAÉ et stages
- Persistance locale (localStorage) — aucun serveur requis

**Démarrage**

Ouvrir directement `planning-web/index.html` dans un navigateur (aucun serveur requis).

Les données sont lues depuis `planning-web/calendar_data.json` et `planning-web/vacances_feries.json`.

---

## Répartition MMI

Suivi de l'affectation des heures CM/TD/TP par ressource et par enseignant pour les 6 semestres du BUT MMI.

**Fonctionnalités**

- Tableau de bord par semestre (S1 à S6, avec variantes initiaux/alternants)
- Calcul automatique des volumes de service (titulaires / vacataires)
- Gestion de la liste des enseignants (CRUD)
- Export des données en Excel (openpyxl)
- Données persistées dans `repartition/data/affectations.json` et `repartition/data/enseignants.json`

---

## Soutenances Stages

Planification des jurys de soutenances de stage pour les promotions MMI2 et MMI3.

**Fonctionnalités**

- Saisie et affichage des créneaux horaires par jury
- Gestion des étudiants, enseignants et maîtres de stage
- Impression des plannings

**Démarrage**

Ouvrir `soutenances_stages/index.html` dans un navigateur (aucun serveur requis).

Données : `soutenances_stages/data/`

---

## Soutenances Portfolio

Planification des jurys de soutenances de portfolio (MMI1, MMI2, MMI3 — initiaux et alternants).

**Fonctionnalités**

- Même structure que Soutenances Stages
- Séparation initiaux / alternants

**Démarrage**

Ouvrir `soutenances_portfolio/index.html` dans un navigateur (aucun serveur requis).

Données : `soutenances_portfolio/data/`

---

## Structure du projet

```
Applications_gestion/
├── index.html                    # Page d'accueil
├── style.css                     # Styles de la page d'accueil
├── planning-web/
│   ├── index.html
│   ├── script.js
│   ├── calendar_data.json
│   └── vacances_feries.json
├── repartition/
│   ├── app.py                    # Serveur Flask
│   ├── templates/
│   ├── static/
│   └── data/
│       ├── affectations.json
│       └── enseignants.json
├── soutenances_stages/
│   ├── index.html
│   └── data/
└── soutenances_portfolio/
    ├── index.html
    └── data/
```

---

## Prérequis

- **Planning / Soutenances** : un navigateur moderne suffit (Chrome, Firefox, Edge)
- **Répartition** : Python 3.10+, Flask, openpyxl

```bash
pip install flask openpyxl
```

## Auteur

Département MMI — IUT de Béziers  
Université de Montpellier
