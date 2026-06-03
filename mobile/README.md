# Legatree iOS (Expo)

Native shell for [legatree.us](https://legatree.us) with haptic feedback on web interactions.

## Local development

```bash
cd mobile
cp .env.example .env   # optional; defaults to production URL
npm install
npm run ios
```

## EAS builds

```bash
npx eas-cli@latest build --platform ios --profile preview --non-interactive
```

Environment variables for `preview` and `production` are managed in the Expo dashboard (EAS Environment Variables), not committed to git.

- Owner: `jarjarb`
- Bundle ID: `com.jarjarb.legatree`
- Apple Team: `C7GY6B6ZW4`
