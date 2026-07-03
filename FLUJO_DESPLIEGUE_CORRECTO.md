# Flujo Correcto de Despliegue

## Orden de operaciones:

### 1. En tu PC (local) - Subir cambios a GitHub
```bash
cd c:\Users\sergi\Desktop\boletera-main\boletera-main
git add .
git commit -m "Descripción de cambios"
git push origin main
git push somnus main
```

### 2. En el servidor - Bajar cambios y rebuild
```bash
cd /var/www/somnus
git pull origin main
rm -rf .next
npm run build
pm2 restart somnus --update-env
```

## Resumen del flujo completo:

**PC → GitHub → Servidor**

1. **PC**: Haces cambios y haces `git push`
2. **GitHub**: Guarda los cambios
3. **Servidor**: Hace `git pull` para bajar los cambios
4. **Servidor**: Rebuild y restart

## Comando todo-en-uno para servidor:

```bash
cd /var/www/somnus && git pull origin main && rm -rf .next && npm run build && pm2 restart somnus --update-env
```

## Importante:
- **NUNCA** hagas `git pull` en el servidor antes de hacer `git push` desde tu PC
- Siempre: **Push primero** (PC) → **Pull después** (Servidor)
