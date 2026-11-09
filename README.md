# LTD Manager — Little Seoul

Application web privée et responsive pour la gestion RP du LTD. **Aucune récupération automatique des ventes FiveM.**

## Fonctions
- Tableau de bord : solde estimé, dépenses du mois, stocks faibles, tâches
- Trésorerie : entrées/sorties manuelles, catégories, export CSV, rapprochement du solde bancaire réel
- Employés : grades, embauche, primes et notes
- Inventaire : quantités, coûts unitaires, seuils d'alerte
- Factures / contrats : suivi, échéances et impression en PDF via le navigateur
- Tâches : priorités, statuts et échéances
- Export de sauvegarde JSON, accès privé, synchronisation cloud
- Installation possible comme raccourci sur mobile via le navigateur

## Installation cloud (environ 15 minutes)

1. Créez un projet sur https://supabase.com/dashboard.
2. Dans **SQL Editor**, collez le contenu de `schema.sql`, puis exécutez-le.
3. Dans **Authentication > Providers > Email**, **désactivez les inscriptions publiques** (Sign ups). Dans **Authentication > Users**, créez manuellement votre compte de directeur avec votre email et un mot de passe robuste. Confirmez son email si nécessaire. Ne créez pas d'autres utilisateurs.
4. Dans **Project Settings > API** (ou Connect), récupérez l'URL du projet et la clé publique `anon`/`publishable` ; renseignez-les dans `config.js`. **N'utilisez jamais `service_role` ni une clé secrète dans le site.**
5. Déployez le contenu de ce dossier sur un hébergement statique HTTPS : Vercel, Netlify ou OVH. Sur Vercel : New Project > importez le dépôt GitHub contenant les fichiers > Framework Preset « Other » > Deploy. Pas de commande de build.
6. Dans **Supabase > Authentication > URL Configuration**, ajoutez votre adresse web dans les URL autorisées si nécessaire.
7. Connectez-vous avec votre compte. Dans **Paramètres**, définissez le solde bancaire initial.

### Utilisation sur tous les appareils
Accédez à l'URL HTTPS du site depuis PC, iPhone, Android ou tablette. Les données sont enregistrées dans Supabase et accessibles après connexion. Sur iPhone : Safari > Partager > Sur l'écran d'accueil.

## Points importants
- Le solde affiché est **estimatif**, puisqu'aucune vente FiveM n'est récupérée. Utilisez « Rapprocher le solde » pour ajouter une écriture d'ajustement explicite quand vous consultez le vrai compte bancaire RP.
- La valeur « Prime cumulée » d'un employé est un suivi administratif indépendant ; elle ne crée pas automatiquement de dépense dans le journal. Pour compter la prime en trésorerie, ajoutez également une sortie.
- Les factures ne modifient pas automatiquement le solde ; le règlement doit être enregistré dans le journal si vous souhaitez le suivre.
- Le PDF est obtenu avec le bouton PDF, puis « Enregistrer au format PDF » dans la fenêtre d'impression.
- L'export JSON est une sauvegarde de lecture ; il n'existe pas encore d'import automatique.
- La sécurité repose sur l'authentification Supabase et les politiques RLS de `schema.sql`. Une URL privée n'est pas une mesure de sécurité suffisante.
- Les fichiers ne contiennent aucune donnée RP réelle ; aucun hébergement ni compte n'a été créé automatiquement.

## Technologie
HTML / CSS / JavaScript sans compilation, Supabase Auth et Postgres avec RLS. Hébergement statique compatible Vercel / Netlify / OVH.
