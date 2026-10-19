# Les Outils du Docteur

Monorepo pnpm de trois applications :

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/lod` | PWA publique (lesoutils.dudocteur.com) | Vite + React 19 + Tailwind v4 + vite-plugin-pwa |
| `apps/lod-pro` | PWA d'administration (non indexée) | idem |
| `apps/lod-react-native` | App mobile | Expo SDK 58 / React Native 0.88 |
| `packages/core` | Catalogue des outils + logique pure (sans React ni DOM) | TypeScript |
| `packages/theme` | Couleurs de la charte (`src/index.ts` pour RN, `theme.css` pour Tailwind) | TypeScript + CSS |

```bash
pnpm install
pnpm dev:lod       # http://localhost:5173
pnpm dev:pro       # http://localhost:5174
pnpm dev:mobile    # Expo (QR code pour Expo Go)
pnpm test          # tests de core et theme
pnpm typecheck     # tous les projets
pnpm build         # lod + lod-pro (icônes PWA et service worker générés au build)
```

Règles :
- **Une seule version de React** (19.3.0) dans tout le dépôt, imposée par `overrides` dans
  `pnpm-workspace.yaml` : Expo ne tolère pas plusieurs versions.
- Dans l'app mobile, installer les paquets avec `npx expo install <paquet>` (versions
  compatibles avec le SDK), voir `apps/lod-react-native/AGENTS.md`.
- `packages/theme` : modifier `src/index.ts` et `theme.css` ensemble (un test le vérifie).
- Supabase n'est pas encore branché : on repart de zéro (voir section 2 pour le schéma du prototype).

---

# Mémoire du premier prototype

Ce document résume ce qui avait été construit dans le premier monorepo `dudocteur`
(apps `home`, `outils`, `moncompte` + packages partagés) avant la remise à zéro du
projet en trois applications : **LOD** (PWA publique), **LOD-Pro** (PWA d'administration)
et **LOD React Native**.

Le code complet du prototype est archivé dans `D:\dudocteur-sauvegarde-2026-10-17.zip`.

---

## 1. Les outils

26 outils étaient déclarés. **3 étaient réellement construits** (IMC, Masse maigre,
Besoins énergétiques), les 23 autres n'étaient que des fiches (placeholder « Outil en
construction »). Tous étaient encore au statut `en-construction` : rien n'était publié.

Tous les outils sont **à visée informative** et le rappellent : ils ne remplacent pas
un avis médical.

### 1.1 Outils construits

#### IMC (`imc`) — « Calculez votre indice de masse corporelle »

Suivi de l'IMC dans le temps à partir de pesées successives.

- **Saisie d'une prise** : date, poids (20–300 kg), taille (100–250 cm, pré-remplie
  avec la dernière taille connue).
- **Un jour = une mesure** : si une prise existe déjà à cette date, l'utilisateur
  choisit laquelle garder (écran « garder l'existante / garder la nouvelle »).
- **Calculs** :
  - IMC = poids / taille², arrondi à 0,1.
  - Catégories OMS : < 18,5 insuffisance pondérale · < 25 normale · < 30 surpoids ·
    < 35 obésité modérée · < 40 obésité sévère · ≥ 40 obésité morbide.
  - Poids idéal = poids correspondant à un IMC de 22 pour la taille.
  - Tendance par rapport à la prise précédente : hausse / baisse / stable (seuil 0,1
    point d'IMC) / première prise.
  - **Appréciation de la tendance selon son effet, pas son sens** : se rapprocher de
    la zone normale est favorable (même une prise de poids chez un sujet maigre),
    s'en éloigner est défavorable.
  - **Commentaire personnalisé** = phrase de situation + phrase d'évolution
    (ex. « Bravo, votre IMC est revenu dans la zone normale ! »,
    « Attention : votre IMC s'éloigne de la zone normale. Parlez-en à votre médecin. »).
  - Ton : vert si IMC normal, orange si hors norme sans aggravation, rouge si hors
    norme et s'aggrave.
- **Objectifs pondéraux** : un poids visé à une date future, un seul par jour.
  - Validation du **rythme réaliste** : au plus 500 g/jour et 2 kg par semaine entamée,
    vérifié depuis le point précédent (pesée ou objectif) **et** jusqu'à l'objectif
    suivant, avec un message d'erreur explicite.
  - Progression : kilos restant à perdre / prendre / atteint (seuil 0,1 kg), IMC et
    catégorie qu'atteindrait l'objectif.
  - Liste des objectifs avec suppression, mise en avant du prochain objectif.
- **Affichage** en deux onglets :
  - *Tableau* : date, poids, taille, IMC, catégorie (pastille colorée), tendance
    (flèche + écart signé).
  - *Courbe* : trois graphiques empilés à axe des dates partagé — Poids, Taille, IMC.
    Bandes de corpulence colorées sur l'IMC (maigre / normale / surpoids / obésité),
    ligne du poids idéal, trajectoire vers les objectifs, objectifs passés en repère,
    graduations « rondes » calculées (pas 0,1/0,2/0,5/1/2/5/10…). Commentaire de la
    dernière prise sous les courbes.
- **Avertissement grossesse** affiché à tous : l'IMC ne s'applique pas pendant la grossesse.
- **Boutons** : Nouvelle prise · Ajouter un objectif pondéral · Contrôler ma masse
  maigre (ouvre l'outil `poids`) · Demander un accompagnement (désactivé, « Bientôt »).
- **Résumé « Mes résultats »** : IMC, catégorie, date de la dernière prise.
- Données de démonstration : 9 pesées de sept. à oct. 2026 (79,2 → 76,5 kg, 175 cm).
  La persistance réelle (via la passerelle) n'était pas encore branchée.

#### Masse maigre et poids idéal (`poids`)

Composition corporelle : masse maigre, masse grasse, métabolisme de base.

- **Sexe** homme/femme (les formules diffèrent) ; avertissement grossesse si femme.
- **Deux modes** :
  - *Estimatif* (poids + taille) : formule de **James (1976)** si IMC < 30, sinon
    **Boer (1984)** (James sous-estime la masse maigre en cas d'obésité).
    - James H : 1,1·P − 128·(P/T)² · F : 1,07·P − 148·(P/T)²
    - Boer H : 0,407·P + 0,267·T − 19,2 · F : 0,252·P + 0,473·T − 48,3
  - *Manuel* (mensurations) : méthode **US Navy** (Hodgdon & Beckett), log décimal.
    - H : %MG = 495 / (1,0324 − 0,19077·log(taille abdo − cou) + 0,15456·log(taille)) − 450
    - F : %MG = 495 / (1,29579 − 0,35004·log(taille abdo + hanches − cou) + 0,221·log(taille)) − 450
    - Résultat rejeté hors de ]2 % ; 70 %[ (mesures à vérifier). Hanches requises pour une femme.
    - Plages : cou 20–70, taille abdo 40–200, hanches 50–200 cm.
    - **Guide de mesure** illustré (où placer le mètre ruban pour chaque mensuration).
- **Indicateurs (4 tuiles KPI colorées)** sur la dernière prise :
  - Masse maigre : basse / suffisante.
  - Masse grasse (kg et %) : idéale H 12–15 %, F 20–24 % → basse / idéale / élevée.
  - Indice de masse maigre (FFMI = masse maigre / taille²) : bas si < 17 (H) / < 15 (F),
    seuils ESPEN 2015 de dénutrition.
  - Métabolisme de base **Katch-McArdle** = 370 + 21,6 × masse maigre, comparé au
    métabolisme « normal » du même poids avec une masse grasse idéale (13,5 % H, 22 % F) :
    écart ≤ 5 % proche, 5–10 % un peu bas, > 10 % bas.
- **Tableau** des prises (formule utilisée, masse maigre, masse grasse, FFMI…) et
  **courbe** du métabolisme de base « Vous » vs « Normale ».
- Commentaire sur l'indice de masse maigre (invite à consulter s'il est bas).
- Bouton « Apprécier vos besoins énergétiques » (ouvre `besoins-energetiques`).
- Format de résultat enregistré **non défini** (rien n'apparaissait dans « Mes résultats »).

#### Dépense et besoins énergétiques (`besoins-energetiques`)

Formulaire en trois sections (Vous · Votre métier · Votre activité physique) et
décomposition du besoin.

- **Entrées** : sexe, poids (20–300), taille (100–250), masse maigre facultative
  (sinon estimée James/Boer comme ci-dessus), type de métier, jours travaillés (0–7),
  minutes de sport par semaine (0–3000), intensité du sport.
- **Calcul** — besoin total = métabolisme + métier + sport + digestion :
  - Métabolisme de base : Katch-McArdle.
  - Métier (jours travaillés, ramené à la semaine), en part du métabolisme :
    assis 25 % · debout peu physique 45 % · physique modéré 65 % · physique intense 90 %
    (avec exemples de métiers ; valeurs cohérentes avec les NAP FAO/OMS).
  - Sport : (MET − 1) × poids × heures / 7 ; MET légère 3,5 · modérée 5 · intense 8.
  - Digestion (thermogenèse alimentaire) : 10 % du reste.
- **Résultats** : détail de chaque composante, total par jour, par semaine, par mois
  (mois moyen = 365,25/12 jours), origine de la masse maigre (saisie / James / Boer).
- Messages d'erreur par champ ; masse maigre doit être > 0 et < poids.

### 1.2 Outils prévus (fiches seulement)

| id | Nom | Description | Organes | Sexe | Conditions |
|---|---|---|---|---|---|
| `tension` | Tension artérielle | Évaluez votre pression artérielle | cardio | tous | HTA, diabète, IR, grossesse |
| `diabete` | Glycémie | Repérez une glycémie à surveiller | métabolisme | tous | diabète, grossesse, obésité |
| `grossesse` | Grossesse | Âge gestationnel et calendrier de grossesse | gynéco | femme | grossesse |
| `abcd2` | Score ABCD2 | Risque d'AVC après un AIT | neuro, cardio | tous | HTA, diabète, personne âgée |
| `dn4` | Score DN4 | Dépistage des douleurs neuropathiques | neuro, douleur | tous | diabète |
| `mmse` | Mini Mental Test | Évaluation des fonctions cognitives (MMSE) | neuro | tous | personne âgée |
| `dfg` | Débit de filtration glomérulaire | Estimation du DFG et stade d'IR | rein | tous | IR, diabète, HTA, personne âgée |
| `analyse-bio` | Interprétation d'une analyse biomédicale | Comprendre une prise de sang ou une analyse d'urine | rein, métabolisme | tous | IR, diabète, personne âgée |
| `hba1c` | HbA1c → glycémie moyenne | Conversion de l'HbA1c en glycémie moyenne estimée | métabolisme | tous | diabète |
| `mna` | Score MNA | Évaluation nutritionnelle (courte et complète) | métabolisme | tous | dénutrition, personne âgée |
| `nrs` | Score NRS 2002 | Dépistage du risque de dénutrition | métabolisme | tous | dénutrition, personne âgée |
| `cycle` | Cycle menstruel | Suivi du cycle, ovulation, fertilité | gynéco | femme | — |
| `puqe` | Score PUQE | Nausées et vomissements de la grossesse | gynéco | femme | grossesse |
| `iief5` | Score IIEF-5 | Évaluation de la fonction érectile | andro | homme | diabète, HTA |
| `apnee-sommeil` | Apnée du sommeil | Dépistage du SAOS | respiratoire, cardio | tous | obésité, HTA, diabète |
| `age-corrige` | Âge corrigé du prématuré | Âge corrigé d'un enfant né prématuré | pédiatrie | tous | enfant prématuré |
| `croissance-oms` | Courbes de croissance OMS | Poids/taille, poids/âge, taille/âge | pédiatrie | tous | prématuré, dénutrition, obésité |
| `alcoolemie` | Alcoolémie | Estimation par la formule de Widmark | toxicologie | tous | — |
| `antidotes` | Poisons et antidotes | Principaux toxiques et leurs antidotes | toxicologie | tous | — |
| `paludisme` | Gravité du paludisme | Critères de gravité d'un accès palustre | infectio | tous | grossesse, prématuré |
| `eva` | Échelle EVA | Intensité de la douleur | douleur | tous | — |
| `fss` | Score FSS | Sévérité de la fatigue | douleur, neuro | tous | — |
| `pss` | Score PSS | Stress perçu | douleur | tous | — |

Ordre d'affichage dans la grille : IMC, tension, glycémie, grossesse, ABCD2, DN4, MMSE,
DFG, analyse bio, HbA1c, besoins énergétiques, masse maigre, MNA, NRS, cycle, PUQE,
IIEF-5, apnée, âge corrigé, croissance OMS, alcoolémie, antidotes, paludisme, EVA, FSS, PSS.

### 1.3 Classification des outils

- **Organes** : neuro (Cerveau & nerfs) · cardio (Cœur & vaisseaux) · rein (Reins) ·
  metabolisme (Métabolisme & nutrition) · gyneco (Gynéco-obstétrique) · andro (Appareil
  génital masculin) · respiratoire (Respiratoire & sommeil) · pediatrie (Pédiatrie &
  croissance) · toxicologie · infectio (Infectiologie) · douleur-bien-etre (Douleur & bien-être).
- **Sexe** : tous · femme · homme.
- **Conditions** : diabète · hypertension · grossesse · insuffisance rénale · personne
  âgée · obésité · dénutrition · enfant / prématuré.

---

## 2. Architecture qui avait fait ses preuves

À reprendre telle quelle dans LOD.

### Contrat d'un outil

Chaque outil est un dossier autonome `tools/<id>/` :

- `functions.ts(x)` : types, calculs, validation, résumé, passerelle ;
- `interface.tsx` : le composant + la fiche (`defineTool`).

Fiche d'un outil (`ToolDefinition<R>`) : `id`, `name`, `description`, `Icon`, `organs`
(au moins un), `sex`, `conditions`, `status` (`en-construction` | `disponible`),
`Component`, `modalSize` (`md` | `xl`), `isResult(value)` (valide une donnée relue du
stockage, potentiellement d'une ancienne version), `summarize(result)` (lignes de
« Mes résultats »).

Règles :
- un outil n'importe **ni les autres outils ni l'app** ; il ouvre un autre outil par son
  identifiant (`openTool("poids")`) ;
- il ne lit/écrit ses données que par sa **passerelle** (`createToolGateway(id, isResult)`
  → `{ result, save, clear, openTool }`), branchée une seule fois sur le store au
  démarrage (`connectMainStore`) ;
- les formules partagées (James/Boer, Katch-McArdle) sont **recopiées** dans chaque outil
  pour garder l'autonomie.

👉 Pour React Native : séparer dès le départ la **logique pure** (calculs, validation,
résumé, métadonnées — sans React ni DOM, icône stockée par nom) des interfaces.

### Fonctionnement de l'app

- Page d'accueil : titre, rappel « visée informative », deux onglets **Outils** (grille
  de cartes) et **Mes résultats** (outils épinglés avec leur résumé, ajout via une modale
  de recherche insensible aux accents, seuls les outils disponibles s'épinglent).
- Carte d'outil : icône dans une pastille, nom, description ; badge « Complété » si un
  résultat valide existe ; « Bientôt disponible » grisé (ou « En construction » ouvrable
  en développement) ; légère élévation au survol.
- Un outil s'ouvre dans une **modale bloquante** (fermeture uniquement par ×, pas par
  clic extérieur ni Échap, pour ne pas perdre une saisie).
- **Hors ligne d'abord** : sans compte (ou sans consentement), tout est dans le
  localStorage. Connecté + consentement donné → Supabase.
- **Synchronisation à la connexion** :
  - seulement local → migré vers le compte ;
  - seulement distant → le distant gagne ;
  - les deux → modale « Deux versions de vos données » : garder le compte (recommandé)
    ou cet appareil ;
  - outils épinglés : fusion sans conflit (ordre du compte d'abord).

### Compte et données (Supabase)

- Session partagée entre sous-domaines par **cookie** sur `.dudocteur.com`.
- App `moncompte` : connexion, inscription, mot de passe oublié/réinitialisation,
  connexion Google (callback), page de consentement, profil, export des données,
  suppression du compte (Edge Function `delete-account` avec la clé service_role).
- Tables (RLS : chacun ne voit que ses lignes) :
  - `tool_results (user_id, tool_id, payload jsonb, updated_at)` — PK (user_id, tool_id) ;
  - `user_dashboards (user_id, tool_ids text[], updated_at)` ;
  - `profiles (id, display_name, sex, birth_date, consented_at, created_at, updated_at)`,
    créé par trigger à l'inscription ; `consented_at` vide = mode hors ligne forcé.
- **Consentement** au traitement des données de santé (Code du numérique, Bénin) :
  case cochée à l'inscription email, demandé à la première connexion Google.

Stack : pnpm workspaces, Vite 6 + React 18 + TypeScript strict, Tailwind v4, Zustand,
TanStack Query, react-hook-form, zod, Recharts, Heroicons, Vitest ; Astro pour le portail.

---

## 3. Thème

### Charte graphique (source : « Les Sandwichs du Docteur »)

Appliquée comme identité commune à tout l'écosystème dudocteur.

- **Couleurs principales** (titres et textes courants) : crème `#ffe8c9`, rouge `#a41624`.
- **Couleurs d'accompagnement** (graphiques, tableaux, cartouches) : orange clair
  `#ffb564`, orange brûlé `#d9571d`.
- **Typographies** :
  - Titres / logo : **Quartzo demo Bold** (et Bold Italic). Licence « personal use only »
    (`quartzo.zip`) et chiffres décoratifs illisibles → **non utilisée** dans l'app,
    remplacée par Poppins. À régler avant déploiement (licence commerciale ou autre fonte).
  - Texte : **Gilroy** Light / Extra Bold — fonte commerciale, substituée par **Poppins**
    (Google Fonts, 300/400/500/600/700 + italique 400).
  - Pas plus de 3 styles typographiques à la fois.
- **Logo** : icône + groupe de mots, immuable. Zone de protection = hauteur du « O ».
  Version couleur à privilégier ; sinon rouge, jaune ocre ou blanc. Interdit : incliner,
  déformer, changer typo/couleurs/proportions, nuire à la lisibilité.
- Motif récurrent de la charte : deux barres verticales (orange brûlé + orange clair)
  à gauche des blocs de texte.

### Jetons de couleur (Tailwind v4, CSS-first)

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `background` | `#fffcf8` | `#1b1210` | fond de page |
| `surface` | `#ffffff` | `#241714` | cartes, modales |
| `surface-alt` | `#ffe8c9` | `#3a2318` | crème de marque |
| `foreground` | `#2a1210` | `#fdecd8` | texte |
| `muted` | `#f5e9dc` | `#3a2a22` | fonds discrets |
| `muted-foreground` | `#6b5b52` | `#c9b3a3` | texte secondaire |
| `border` | `#f0d9be` | `#4a342a` | bordures |
| `primary` | `#a41624` | `#e5495a` | rouge de marque, actions |
| `primary-hover` | `#8a121f` | `#f06478` | |
| `primary-foreground` | `#ffffff` | `#ffffff` | |
| `secondary` | `#d9571d` | `#ff8a4d` | orange brûlé |
| `secondary-foreground` | `#ffffff` | `#241714` | |
| `accent` | `#ffb564` | `#ffb564` | orange clair |
| `accent-foreground` | `#451a03` | `#2a1210` | |
| `success` | `#15803d` | `#4ade80` | état normal |
| `warning` | `#d97706` | `#fbbf24` | hors norme |
| `warning-text` | `#b45309` | `#fbbf24` | orange lisible en texte (≥ 4,5:1) |
| `destructive` | `#dc2626` | `#f87171` | danger / aggravation |
| `chart-reference` | `#2563eb` | `#3b82f6` | courbes « normale » des graphiques |
| `ring` | `#a41624` | `#e5495a` | focus |

Les `*-foreground` de success/warning/destructive : blanc en clair ; `#052e13`,
`#1c1204`, `#1c0a0a` en sombre.

- Rayon par défaut : `0.75rem` ; cartes `rounded-2xl`, champs `rounded-xl`, boutons et
  onglets en pilule `rounded-full`.
- Code couleur santé partout : **vert** = normal, **orange** = hors norme stable/en
  amélioration, **rouge** = hors norme qui s'aggrave.
- Encadrés d'avertissement : bordure `warning/50`, fond `warning/10`, texte `warning-text`,
  icône triangle.

### Mode sombre

- Suit le système (`prefers-color-scheme`) sauf choix explicite `data-theme="light|dark"`
  sur `<html>`, mémorisé dans `localStorage["dudocteur-theme"]`.
- Script inline dans le `<head>` qui pose `data-theme` avant le rendu (pas de flash).
- Bouton bascule soleil/lune rond (44 px).
- Transitions de couleur de 500 ms, désactivées si `prefers-reduced-motion`.
- Défilement doux si mouvement autorisé.

### Polices dans le `<head>`

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
```

(Par `<link>` et non `@import` : un `@import` après les couches Tailwind est ignoré.)

### Ressources conservées

- `Charte graphique.pdf` — charte complète.
- `quartzo.zip` — police Quartzo (usage personnel uniquement, ne pas versionner/publier).
- `assets/logo.png`, `assets/favicon.png` — logo et favicon de l'app outils.
