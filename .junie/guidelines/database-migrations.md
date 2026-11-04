# Règles de gestion des migrations Prisma

## ⚠️ INTERDIT : `prisma db push` en production

**Ne JAMAIS utiliser `prisma db push` sur la base de données de production.**

Cette commande est conçue uniquement pour le développement local et peut **réinitialiser toute la base de données** si elle détecte un dérife entre les migrations et le schema.

## Commandes autorisées

| Contexte | Commande | Description |
|----------|----------|-------------|
| **Production** | `prisma migrate deploy` | Applique les migrations sans interaction |
| **Développement** | `prisma migrate dev` | Crée et applique les migrations |
| **Vérification** | `prisma migrate status` | Vérifie l'état des migrations |

## Workflow pour ajouter une migration

1. Modifie le schema dans `prisma/schema.prisma`
2. En développement : `prisma migrate dev --name <nom_descriptif>`
3. En production : `prisma migrate deploy`

## En cas de divergence après restauration

Si la base a été restaurée (Neon Time Travel) et que les migrations ne correspondent plus :

1. Compare le schema avec la base : `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
2. Crée manuellement le dossier de migration dans `prisma/migrations/<nom>/`
3. Ajoute `migration.sql` avec les différences
4. Ajoute `migration_lock.toml` avec `version = 1` et `generator = "prisma"`
5. Applique le SQL directement via un script Node.js avec `pg`
6. Enregistre la migration dans `_prisma_migrations`

## Rappel

- **Production** : `prisma migrate deploy` uniquement
- **Développement** : `prisma migrate dev`
- **JAMAIS** : `prisma db push` en production
