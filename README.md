# BPC_POS

## Local infrastructure

Start Valkey and the self-hosted translation service:

```bash
pnpm infra:up
```

The app uses LibreTranslate from `LIBRETRANSLATE_URL` in `.env`.

## Translation behavior

- Main DB content is stored in English only
- UI language switching is controlled by `i18next`
- When Bangla mode is active, unseen English text is translated through the local LibreTranslate service
- Translated text is cached in Postgres and in the browser so repeated UI text avoids repeated translation work
