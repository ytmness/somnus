# Migrar la base de datos a Postgres propio (sin Supabase)

## 1. En el VPS

```bash
cd /var/www/somnus
sudo bash scripts/setup-local-postgres.sh
# Guarda DATABASE_URL / DIRECT_URL que imprime el script
```

## 2. Dump desde Supabase (solo schema `public`)

Usa la URL **directa** (no pooler):

```bash
export SUPABASE_DIRECT_URL='postgres://postgres.[PROJECT]:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'
export LOCAL_DB_URL='postgresql://somnus_app:[PASS]@localhost:5432/somnus'
bash scripts/migrate-db-to-vps.sh
```

## 3. Actualizar `.env` del servidor

```env
DATABASE_URL=postgresql://somnus_app:[PASS]@localhost:5432/somnus
DIRECT_URL=postgresql://somnus_app:[PASS]@localhost:5432/somnus
```

```bash
npx prisma generate
pm2 restart somnus
```

## 4. Backups

```bash
chmod +x scripts/backup-postgres.sh
# Cron diario 3am
echo '0 3 * * * /var/www/somnus/scripts/backup-postgres.sh >> /var/log/somnus-pg-backup.log 2>&1' | sudo tee /etc/cron.d/somnus-pg-backup
```

## 5. Rollback

Mantén el proyecto Supabase intacto. Si falla, restaura `DATABASE_URL`/`DIRECT_URL` al pooler de Supabase y reinicia PM2.
