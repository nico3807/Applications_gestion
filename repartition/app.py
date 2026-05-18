import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash

from utils.xlsx_parser import get_all_ressources, get_enseignants, get_maquette_data

app = Flask(__name__)
app.secret_key = "mmi_service_2025"

# ── Chemins ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
XLSX_PATH = os.path.join(BASE_DIR, "BUT_MMI_2025-26.xlsx")
DATA_PATH               = os.path.join(BASE_DIR, "data", "affectations.json")
ENSEIGNANTS_JSON_PATH   = os.path.join(BASE_DIR, "data", "enseignants.json")
ENSEIGNANTS_OVERRIDES_PATH = os.path.join(BASE_DIR, "data", "enseignants_overrides.json")  # migration uniquement

# ── Ordre d'affichage des semestres ────────────────────────────────────────────
SEMESTRES = ["S1", "S2", "S3", "S4 crea", "S4 dev", "S5 crea", "S5 dev", "S6 crea", "S6 dev"]


def slug(semestre):
    """'S4 crea' → 'S4-crea'"""
    return semestre.replace(" ", "-")


def unslug(s):
    """'S4-crea' → 'S4 crea'"""
    return s.replace("-", " ")


# ── Chargement initial des données XLSX ───────────────────────────────────────
try:
    ALL_RESSOURCES = get_all_ressources(XLSX_PATH)
    _xlsx_enseignants = get_enseignants(XLSX_PATH)
    XLSX_OK = True
except FileNotFoundError:
    ALL_RESSOURCES = {s: [] for s in SEMESTRES}
    _xlsx_enseignants = []
    XLSX_OK = False
except Exception as e:
    ALL_RESSOURCES = {s: [] for s in SEMESTRES}
    _xlsx_enseignants = []
    XLSX_OK = False
    print(f"[ERREUR] Impossible de lire le fichier XLSX : {e}")


# ── Initialisation de enseignants.json (migration depuis XLSX + overrides) ────
def _init_enseignants_json():
    """Crée enseignants.json à partir du XLSX + overrides si le fichier n'existe pas encore."""
    if os.path.exists(ENSEIGNANTS_JSON_PATH):
        return
    overrides = {}
    if os.path.exists(ENSEIGNANTS_OVERRIDES_PATH):
        with open(ENSEIGNANTS_OVERRIDES_PATH, "r", encoding="utf-8") as f:
            overrides = json.load(f)
    suppressed = set(overrides.get("suppressions", []))
    sdu_overrides = overrides.get("service_du_overrides", {})
    base = [dict(e) for e in _xlsx_enseignants if e["id"] not in suppressed]
    ajouts = [dict(e) for e in overrides.get("ajouts", []) if e["id"] not in suppressed]
    combined = base + ajouts
    for e in combined:
        if e["id"] in sdu_overrides:
            e["service_du"] = sdu_overrides[e["id"]]
    combined.sort(key=lambda e: e["id"])
    os.makedirs(os.path.dirname(ENSEIGNANTS_JSON_PATH), exist_ok=True)
    with open(ENSEIGNANTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

_init_enseignants_json()


# ── Gestion de la liste d'enseignants (source unique : enseignants.json) ──────
def load_enseignants():
    if os.path.exists(ENSEIGNANTS_JSON_PATH):
        with open(ENSEIGNANTS_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_enseignants(data):
    os.makedirs(os.path.dirname(ENSEIGNANTS_JSON_PATH), exist_ok=True)
    with open(ENSEIGNANTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_enseignants_list():
    return sorted(load_enseignants(), key=lambda e: e["id"])


# ── Persistance JSON ───────────────────────────────────────────────────────────
def load_affectations():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_affectations(data):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Contexte global pour les templates ────────────────────────────────────────
@app.context_processor
def inject_globals():
    return {
        "semestres": SEMESTRES,
        "slug_fn": slug,
        "xlsx_ok": XLSX_OK,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/semestre/<semestre_slug>")
def semestre(semestre_slug):
    sem = unslug(semestre_slug)
    if sem not in SEMESTRES:
        return "Semestre introuvable", 404

    ressources = ALL_RESSOURCES.get(sem, [])
    affectations = load_affectations()
    sem_data = affectations.get(sem, {})

    # Charger les prévisionnels finaux depuis la maquette (overrides inclus)
    try:
        maquette_rows = get_maquette_data(XLSX_PATH, sem)
    except Exception:
        maquette_rows = []
    maquette_overrides = load_maquette_overrides().get(sem, {})
    previsionnel = {}
    for mr in maquette_rows:
        ov = maquette_overrides.get(mr["intitule"], {})
        previsionnel[mr["intitule"]] = {
            "cm_final": ov.get("cm_final", mr["cm_final"]),
            "td_final": ov.get("td_final", mr["td_final"]),
            "tp_final": ov.get("tp_final", mr["tp_final"]),
        }

    # Construire la liste des lignes pour le template
    rows = []
    for r in ressources:
        saved = sem_data.get(r, {})
        prev = previsionnel.get(r, {})
        rows.append({
            "intitule": r,
            "enseignant": saved.get("enseignant", ""),
            "cm": saved.get("cm", 0),
            "td": saved.get("td", 0),
            "tp": saved.get("tp", 0),
            "subrows": saved.get("subrows", []),
            "prev_cm": prev.get("cm_final", 0),
            "prev_td": prev.get("td_final", 0),
            "prev_tp": prev.get("tp_final", 0),
        })

    return render_template(
        "semestre.html",
        semestre=sem,
        semestre_slug=semestre_slug,
        rows=rows,
        enseignants=get_enseignants_list(),
    )


@app.route("/semestre/<semestre_slug>/save", methods=["POST"])
def save_semestre(semestre_slug):
    sem = unslug(semestre_slug)
    if sem not in SEMESTRES:
        return "Semestre introuvable", 404

    affectations = load_affectations()
    sem_data = {}

    ressources = ALL_RESSOURCES.get(sem, [])
    for r in ressources:
        key = r
        enseignant = request.form.get(f"enseignant_{ressources.index(r)}", "")
        try:
            cm = float(request.form.get(f"cm_{ressources.index(r)}", 0) or 0)
        except ValueError:
            cm = 0
        try:
            td = float(request.form.get(f"td_{ressources.index(r)}", 0) or 0)
        except ValueError:
            td = 0
        try:
            tp = float(request.form.get(f"tp_{ressources.index(r)}", 0) or 0)
        except ValueError:
            tp = 0

        # Collecter les sous-lignes via sub_td (présent dans tous les semestres)
        i = ressources.index(r)
        prefix = f"sub_td_{i}_"
        sub_keys = [k[len(prefix):] for k in request.form.keys() if k.startswith(prefix)]
        subrows = []
        for sk in sub_keys:
            try:
                sub_cm = float(request.form.get(f"sub_cm_{i}_{sk}", 0) or 0)
            except ValueError:
                sub_cm = 0
            try:
                sub_td = float(request.form.get(f"sub_td_{i}_{sk}", 0) or 0)
            except ValueError:
                sub_td = 0
            try:
                sub_tp = float(request.form.get(f"sub_tp_{i}_{sk}", 0) or 0)
            except ValueError:
                sub_tp = 0
            subrows.append({
                "enseignant": request.form.get(f"sub_enseignant_{i}_{sk}", ""),
                "cm": sub_cm,
                "td": sub_td,
                "tp": sub_tp,
            })

        sem_data[key] = {
            "enseignant": enseignant,
            "cm": cm,
            "td": td,
            "tp": tp,
            "subrows": subrows,
        }

    affectations[sem] = sem_data
    save_affectations(affectations)
    flash("Enregistrement réussi ✓", "success")
    return redirect(url_for("semestre", semestre_slug=semestre_slug))


# ── Page Maquette ─────────────────────────────────────────────────────────────
MAQUETTE_DATA_PATH = os.path.join(BASE_DIR, "data", "maquette_overrides.json")


def load_maquette_overrides():
    if os.path.exists(MAQUETTE_DATA_PATH):
        with open(MAQUETTE_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_maquette_overrides(data):
    os.makedirs(os.path.dirname(MAQUETTE_DATA_PATH), exist_ok=True)
    with open(MAQUETTE_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route("/maquette")
def maquette_index():
    return render_template("maquette_index.html")


@app.route("/maquette/<semestre_slug>")
def maquette_semestre(semestre_slug):
    sem = unslug(semestre_slug)
    if sem not in SEMESTRES:
        return "Semestre introuvable", 404

    try:
        rows_xlsx = get_maquette_data(XLSX_PATH, sem)
    except Exception as e:
        rows_xlsx = []
        print(f"[ERREUR maquette] {e}")

    overrides = load_maquette_overrides().get(sem, {})

    # Récupérer les sous-totaux CM/TD/TP depuis affectations.json pour ce semestre
    affectations = load_affectations()
    sem_data = affectations.get(sem, {})
    sous_totaux = {}
    for ressource, data in sem_data.items():
        cm = data.get("cm", 0) + sum(s.get("cm", 0) for s in data.get("subrows", []))
        td = data.get("td", 0) + sum(s.get("td", 0) for s in data.get("subrows", []))
        tp = data.get("tp", 0) + sum(s.get("tp", 0) for s in data.get("subrows", []))
        sous_totaux[ressource] = {"cm": cm, "td": td, "tp": tp}

    # Fusionner les overrides dans les lignes
    rows = []
    for r in rows_xlsx:
        ov = overrides.get(r["intitule"], {})
        rows.append({
            **r,
            "adapt_locale": ov.get("adapt_locale", r["adapt_locale"]),
            "dont_tp_adapt": ov.get("dont_tp_adapt", r["dont_tp_adapt"]),
            "cm_final":     ov.get("cm_final",     r["cm_final"]),
            "td_final":     ov.get("td_final",     r["td_final"]),
            "tp_final":     ov.get("tp_final",     r["tp_final"]),
            "reel_cm": sous_totaux.get(r["intitule"], {}).get("cm", 0),
            "reel_td": sous_totaux.get(r["intitule"], {}).get("td", 0),
            "reel_tp": sous_totaux.get(r["intitule"], {}).get("tp", 0),
        })

    return render_template(
        "maquette_semestre.html",
        semestre=sem,
        semestre_slug=semestre_slug,
        rows=rows,
    )


@app.route("/maquette/<semestre_slug>/save", methods=["POST"])
def maquette_save(semestre_slug):
    sem = unslug(semestre_slug)
    if sem not in SEMESTRES:
        return "Semestre introuvable", 404

    try:
        rows_xlsx = get_maquette_data(XLSX_PATH, sem)
    except Exception:
        rows_xlsx = []

    overrides = load_maquette_overrides()
    sem_overrides = {}

    def _f(key):
        try:
            return float(request.form.get(key, 0) or 0)
        except ValueError:
            return 0.0

    for i, r in enumerate(rows_xlsx):
        sem_overrides[r["intitule"]] = {
            "adapt_locale":  _f(f"adapt_locale_{i}"),
            "dont_tp_adapt": _f(f"dont_tp_adapt_{i}"),
            "cm_final":      _f(f"cm_final_{i}"),
            "td_final":      _f(f"td_final_{i}"),
            "tp_final":      _f(f"tp_final_{i}"),
        }

    overrides[sem] = sem_overrides
    save_maquette_overrides(overrides)
    flash("Maquette enregistrée ✓", "success")
    return redirect(url_for("maquette_semestre", semestre_slug=semestre_slug))


# ── Page Services ─────────────────────────────────────────────────────────────
@app.route("/services")
def services():
    affectations = load_affectations()

    # Construire un dict {nom_enseignant: [{semestre, ressource, cm, td, tp, total}]}
    par_enseignant = {}

    for sem in SEMESTRES:
        sem_data = affectations.get(sem, {})
        for ressource, data in sem_data.items():
            entries = [{"enseignant": data.get("enseignant", ""), "cm": data.get("cm", 0),
                        "td": data.get("td", 0), "tp": data.get("tp", 0)}]
            for sub in data.get("subrows", []):
                entries.append({"enseignant": sub.get("enseignant", ""), "cm": sub.get("cm", 0),
                                 "td": sub.get("td", 0), "tp": sub.get("tp", 0)})
            for entry in entries:
                ens = entry["enseignant"].strip()
                if not ens:
                    continue
                cm, td, tp = entry["cm"], entry["td"], entry["tp"]
                if sem in ("S1", "S2", "S3"):
                    total = cm * 1 + td * 2 + tp * 4
                else:
                    total = td * 1 + tp * 2
                if total == 0:
                    continue
                par_enseignant.setdefault(ens, []).append({
                    "semestre": sem,
                    "ressource": ressource,
                    "cm": entry["cm"],
                    "td": entry["td"],
                    "tp": entry["tp"],
                    "total": total,
                })

    # Trier par nom d'enseignant
    par_enseignant = dict(sorted(par_enseignant.items()))

    # Construire un dict {id_enseignant: service_du/service_max/is_vac} depuis la liste des enseignants
    ens_list = get_enseignants_list()
    service_du_map  = {e["id"]: e.get("service_du")  for e in ens_list}
    service_max_map = {e["id"]: e.get("service_max") for e in ens_list}
    is_vac_map      = {e["id"]: e.get("is_vac", False) for e in ens_list}

    tous_enseignants = sorted(e["id"] for e in ens_list)

    return render_template("services.html", par_enseignant=par_enseignant,
                           service_du_map=service_du_map,
                           service_max_map=service_max_map,
                           is_vac_map=is_vac_map,
                           tous_enseignants=tous_enseignants)


# ── Ajout / Suppression d'enseignants ─────────────────────────────────────────
@app.route("/enseignants/ajouter", methods=["GET", "POST"])
def enseignant_ajouter():
    if request.method == "POST":
        nom    = request.form.get("nom", "").strip().upper()
        prenom = request.form.get("prenom", "").strip()
        try:
            service_du = float(request.form.get("service_du", "") or 0)
        except ValueError:
            service_du = 0
        is_vac = request.form.get("is_vac") == "on"

        if not nom and not prenom:
            flash("Le nom ou le prénom est requis.", "danger")
            return redirect(url_for("enseignant_ajouter"))

        uid = f"{nom} {prenom}".strip()
        ens_list = load_enseignants()

        if any(e["id"] == uid for e in ens_list):
            flash(f"L'enseignant « {uid} » existe déjà.", "danger")
            return redirect(url_for("enseignant_ajouter"))

        ens_list.append({
            "id": uid, "nom": nom, "prenom": prenom,
            "service_du": service_du if service_du else None,
            "service_max": None, "is_vac": is_vac,
        })
        ens_list.sort(key=lambda e: e["id"])
        save_enseignants(ens_list)
        flash(f"Enseignant « {uid} » ajouté ✓", "success")
        return redirect(url_for("services"))

    return render_template("enseignant_ajouter.html")


@app.route("/enseignants/modifier", methods=["GET", "POST"])
def enseignant_modifier():
    enseignants = get_enseignants_list()
    if request.method == "POST":
        uid = request.form.get("enseignant_id", "").strip()
        try:
            service_du = float(request.form.get("service_du", "") or 0)
        except ValueError:
            service_du = 0

        if not uid:
            flash("Veuillez sélectionner un enseignant.", "danger")
            return redirect(url_for("enseignant_modifier"))

        ens_list = load_enseignants()
        for e in ens_list:
            if e["id"] == uid:
                e["service_du"] = service_du if service_du else None
                break
        save_enseignants(ens_list)
        flash(f"Service dû de « {uid} » mis à jour ✓", "success")
        return redirect(url_for("services"))

    selected = request.args.get("ens", "")
    return render_template("enseignant_modifier.html", enseignants=enseignants, selected=selected)


@app.route("/enseignants/supprimer", methods=["GET", "POST"])
def enseignant_supprimer():
    enseignants = get_enseignants_list()
    if request.method == "POST":
        uid = request.form.get("enseignant_id", "").strip()
        if not uid:
            flash("Veuillez sélectionner un enseignant.", "danger")
            return redirect(url_for("enseignant_supprimer"))

        ens_list = load_enseignants()
        ens_list = [e for e in ens_list if e["id"] != uid]
        save_enseignants(ens_list)
        flash(f"Enseignant « {uid} » supprimé ✓", "success")
        return redirect(url_for("services"))

    return render_template("enseignant_supprimer.html", enseignants=enseignants)


# ── API JSON ───────────────────────────────────────────────────────────────────
@app.route("/api/enseignants")
def api_enseignants():
    return jsonify(get_enseignants_list())


@app.route("/api/affectations/<semestre_slug>")
def api_affectations(semestre_slug):
    sem = unslug(semestre_slug)
    affectations = load_affectations()
    return jsonify(affectations.get(sem, {}))


# ── Lancement ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not XLSX_OK:
        print("=" * 60)
        print("ATTENTION : fichier BUT_MMI_2025-26.xlsx introuvable !")
        print(f"Chemin attendu : {XLSX_PATH}")
        print("=" * 60)
    
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "False") == "True"
    app.run(host="0.0.0.0", port=port, debug=debug)
