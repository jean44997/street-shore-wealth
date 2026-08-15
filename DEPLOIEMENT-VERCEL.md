# Déployer Street Shore sur Vercel

L'app est une application TanStack Start (SSR). Vercel sait la déployer, mais il faut
lui donner le bon preset de build et les variables d'environnement.

## 1. Importer le projet

1. Pousser le code sur GitHub (bouton GitHub dans Lovable).
2. Sur Vercel : **Add New… → Project → Import** le dépôt.
3. Framework preset : **Other** (le fichier `vercel.json` fournit déjà les commandes).

## 2. Réglages de build (déjà dans `vercel.json`)

| Réglage | Valeur |
| --- | --- |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `.output/public` |
| Node.js Version | 20.x ou 22.x |

Si Vercel affiche une erreur de sortie serveur, ajouter dans **Settings → Environment
Variables** la variable `NITRO_PRESET = vercel` (le build TanStack Start génère alors
la fonction serveur au format Vercel).

## 3. Variables d'environnement à créer sur Vercel

À créer pour les 3 environnements (Production, Preview, Development) :

| Nom | Valeur | Rôle |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | l'URL de la base (onglet Backend de Lovable) | client navigateur |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publique `sb_publishable_…` | client navigateur |
| `VITE_SUPABASE_PROJECT_ID` | identifiant du projet | client navigateur |
| `SUPABASE_URL` | même URL | rendu serveur |
| `SUPABASE_PUBLISHABLE_KEY` | même clé publique | rendu serveur |
| `NITRO_PRESET` | `vercel` | build serveur |

> Les valeurs exactes se trouvent dans le fichier `.env` du projet.
> Ne jamais mettre de clé de service (`service role`) sur Vercel : l'application
> n'en a pas besoin, tout passe par les règles de sécurité de la base.

## 4. Après le premier déploiement

- Ajouter le domaine Vercel dans les URLs de redirection d'authentification du backend
  (Site URL + Redirect URLs), sinon la connexion renverra vers l'ancien domaine.
- Vérifier `https://<domaine>/manifest.webmanifest` pour l'installation PWA.
- La console admin reste sur `/(admin)/<code secret>` et est en `noindex`.

## Alternative

Le bouton **Publish** de Lovable déploie la même application sans configuration :
Vercel n'est utile que si vous voulez héberger vous-même.
