# Plantilla de pase de Apple Wallet

`Somnus.pass/` es el *model* que consume `passkit-generator` desde
[`lib/services/wallet-pass.ts`](../../lib/services/wallet-pass.ts). Contiene la
maqueta del pase (colores, tipo, assets) pero **ningún dato de boleto**: los
campos, el código QR y los identificadores se inyectan en tiempo de ejecución.

## Contenido

| Archivo | Qué es |
| --- | --- |
| `pass.json` | Base del pase. `passTypeIdentifier` y `teamIdentifier` se sobrescriben en runtime con `APPLE_PASS_TYPE_ID` y `APPLE_PASS_TEAM_ID`. |
| `icon.png` / `icon@2x.png` / `icon@3x.png` | Monograma Somnus, 29 / 58 / 87 px. Obligatorio para Apple. |
| `logo.png` / `logo@2x.png` / `logo@3x.png` | Wordmark en la cabecera del pase, 160 / 320 / 480 px de ancho. |

Todos los PNG se generan desde `public/assets/SOMNUS LOGO BLANCO.png` con:

```bash
npm run assets:ios
```

Si cambia el logo de marca, vuelve a ejecutar ese comando y commitea los PNG
resultantes. Para arte a medida (por ejemplo un `strip.png` por evento) basta con
dejar los archivos aquí: `passkit-generator` incluye todo el directorio.

## Certificados

Los PNG viven en el repo; **los certificados no**. El pase se firma en el VPS con
los PEM que apuntan las variables `APPLE_PASS_CERT_PATH`, `APPLE_PASS_KEY_PATH` y
`APPLE_WWDR_CERT_PATH`. El procedimiento completo está en
[`docs/IOS_APP_SETUP.md`](../../docs/IOS_APP_SETUP.md).

Sin esos certificados el endpoint de pases responde **503** de forma controlada y
el botón "Agregar a Apple Wallet" no se muestra.
