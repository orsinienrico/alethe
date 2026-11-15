# ALETHE — Reale o non torna?

Il gioco giornaliero del giudizio. Static app + Cloudflare Pages Functions + **D1**. Frontend zero dipendenze, zero build; backend per auth/punteggi/classifiche su Pages Functions.

## Struttura

```
alethe/
├── index.html            # markup: niente JS/CSS/handler inline → CSP 'self' senza unsafe-inline
├── privacy.html          # privacy policy + disclaimer contenuti
├── og.png                # immagine Open Graph (gen-og.js la rigenera; da sostituire con versione designed)
├── css/
│   └── alethe.css        # design system: font self-hosted, palette, componenti, animazioni
├── fonts/                # Fraunces Variable (WONK) + Libre Franklin + Courier Prime (woff2, self-hosted)
├── js/
│   ├── data.js           # dataset parte 1: set 001-020 (tema + lead + dossier + 5 storie)
│   ├── data2.js          # dataset parte 2: set 021-040 + proSet (gated)
│   ├── card.js           # share card immagine (canvas 1080×1350, webfont + numeri nelle celle)
│   └── app.js            # stato, gioco, combo, streak, countdown, deep link, dossier, recovery, auth, paywall
├── functions/api/        # Cloudflare Pages Functions (binding D1: DB)
│   ├── auth/             # register/login/me/logout — PBKDF2, sessione opaca, cookie HttpOnly
│   ├── scores.js         # POST partita (auth) / GET ultime 20
│   ├── leaderboard.js    # top 10 della settimana
│   └── checkout.js       # stub Stripe
├── migrations/0001_init.sql
├── wrangler.toml         # binding D1 (database_id da completare) + migrations_dir
├── icons/                # icon.svg, icon-maskable.svg, flame.svg
├── manifest.webmanifest  # PWA installabile
├── sw.js                 # network-first sui contenuti quotidiani, cache-first sul resto
├── _headers              # security headers + cache font/og
├── mockups.html          # confronto delle 3 direzioni di design (artefatto di sviluppo)
├── a11y-check.js         # verifica WCAG dei contrasti del design
└── gen-og.js             # genera og.png (script di build)
```

## Design system — direzione "Neon digitale" (palette scelta tra 3, su struttura "Editoriale alchemico")

- **Tipografia self-hosted** (CSP `font-src 'self'`): **Fraunces Variable** con asse **WONK** per display/titoli + **Libre Franklin** per UI + **Courier Prime** per metadati (kicker/fonte/countdown)
- **Palette "Neon digitale"**: bg nero viola `#05060E` con aurora e griglia tech, bianco freddo `#EAF2FF`, **aqua neon `#00E5C0`** (verità: CI CREDO, GIUSTO, kicker, Lucidità), **magenta `#FF4D6D`** (errore: NON MI TORNA, SBAGLIATO, streak a rischio), **oro elettrico `#FFD166`** (reward: crediti, streak, combo), **viola `#7C6CFF`** (PRO/interattività: progress, countdown, bordi). Regola anti-casino: un solo hue con glow per schermata
- **Bordi-circuito** (doppio background-clip) sulla story-card, **aberrazione cromatica** sul drag, glow aqua sui CTA
- **Il dossier su carta fredda** (`#F1F4FA`/`#0B1020`): il documento che si guadagna con 4+/5 — l'unico momento chiaro dell'app, per questo riconoscibile
- **Accessibilità verificata con script** (`a11y-check.js`): 29 coppie di contrasto WCAG 2.1 — tutte ≥4.5:1 (AA) per il testo, ≥3:1 per UI/bordi. Focus-visible, `prefers-reduced-motion`, ruoli ARIA, touch target 44px

## Contenuto — 40 giorni di sfide

**200 storie su 40 set tematici** (57% real / 43% notreal): ogni giorno una sfida diversa per 40 giorni, poi il ciclo ricomincia. Ogni set è un percorso editoriale:

- **Tema**: le 5 storie convergono in un frame ("I numeri che persuadono", "La storia corretta", "Il ritorno"...)
- **Dossier**: sbloccato con 4+/5 — mini-approfondimento sul tema + la psicologia dell'inganno + la regola da portare a casa
- **Tre tipi di storia**: fatti veri verificabili (con fonte nominabile), **miti popolari smascherati** (struzzi, sangue blu, 10% del cervello — il reveal insegna il debunk), casi inventati con meccanismo spiegato (studio con numero preciso, ente che annuncia, arte virale)

Il dataset è in `js/data.js` + `js/data2.js` e sostituibile senza toccare la logica: per aggiungere set basta un file nuovo nello stesso schema.

## Loop di prodotto

**Gioco**: sfida **#N** numerata dal lancio · 5 storie · combo **A FUOCO** (3 corrette ×2, 4 → ×2.5+, 5 → ×3) con meter visibile · streak persistente con fiamma · countdown live alla mezzanotte locale (allineato al set) · allenamento su un altro set, senza crediti (anti-farm: la sfida di oggi già giocata = allenamento automatico) · dal livello 3 entrano i **casi sottili** ("sempre più difficile" è vero) · livelli Reader→Alethean con soglie estese · recovery modal quando la streak si spezza · banner "streak a rischio" dopo le 18.

**Viralità**: "Sfida qualcuno" genera la **share card immagine** (canvas con webfont, celle numerate, sfida #N) + testo leggibile senza contesto (✅❌, Lucidità, streak) + **deep link** `?ref=Nome&s=124&score=85` → il ricevente atterra in **challenge mode** ("Enrico ha fatto 85% — Accetta la sfida", intro ridotta al duello), gioca lo stesso set e riceve il confronto; chi perde ottiene la **rivincita** pronta.

**Freemium**: Free per sempre · **PRO €3,99/mese** (archivio, casi sottili, statistiche bias, leghe, streak freeze, temi) · gate client-side `isPro()`, da rafforzare lato Functions con i pagamenti.

## Database (D1) — come gestirlo su Cloudflare

**Sì, serve DB**: account, punteggi sincronizzati, classifiche, pagamenti, referral. **D1 (SQLite serverless) è la scelta giusta su Cloudflare**: free tier, incluso in Pages, zero rete da gestire.

1. **Creare**: Dashboard → Workers & Pages → D1 → Create database → `alethe-db` (nota il database_id)
2. **Configurare**: incollare `database_id` in [wrangler.toml](wrangler.toml)
3. **Migrations**: `npm run db:migrate:local` (D1 locale per dev) · `npm run db:migrate` (produzione). Nuove migration = file nuovo in `migrations/`, mai modificare quelle esistenti
4. **Binding Pages**: Settings → Functions → D1 bindings → `DB` → `alethe-db`
5. **Local dev**: `npm install && npm run dev` → wrangler pages dev con D1 locale + API reali
6. **Backup/restore**: D1 Time Travel (ripristino a qualunque punto degli ultimi 30 giorni, automatico); export: `npx wrangler d1 export alethe-db --remote --output=backup.sql`
7. **Tabelle**: `users` (email, hash PBKDF2, plan) · `sessions` (token opaco) · `scores` (partite sincronizzate) — [migrations/0001_init.sql](migrations/0001_init.sql)

## Sicurezza

CSP `default-src 'self'` senza unsafe-inline (analytics Cloudflare allowlistata) · PBKDF2-SHA256 100k + salt per utente · sessione opaca (in D1 solo SHA-256 del token) · cookie HttpOnly+Secure+SameSite=Strict · no user enumeration · validazione input · `frame-ancestors 'none'`, nosniff, HSTS, COOP, CORP, Permissions-Policy minimal.

## Lancio in locale

```bash
python -m http.server 8080        # statico (auth/scores in modalità demo su localStorage)
npm install && npm run dev        # completo: Functions + D1 locale (auth e sync reali)
```

## Deploy su Cloudflare (dashboard, a mano)

1. D1: crea `alethe-db` + applica migrations
2. Pages: Connect to Git → repo `orsinienrico/alethe`, branch `main`, build command vuoto, output `/`
3. Binding: Settings → Functions → D1 → `DB` → `alethe-db`
4. **Analytics**: Web Analytics → attiva (CSP già pronta per il beacon)
5. Deploy → `alethe.pages.dev`; ogni push su `main` = auto-deploy; bumpare `CACHE` in `sw.js` a ogni rilascio
6. **og.png**: aggiornare `og:image`/`twitter:image` in `index.html` con l'URL assoluto del dominio (WhatsApp risolve solo URL assoluti)

## Roadmap (dal panel di esperti)

- **P1**: scoring server-side (storie senza `truth` nel bundle), UI leaderboard (endpoint già pronto), referral con crediti (+50 all'invitante via D1), evento funnel `POST /api/event` (game_start/share/accept), teaser PRO giornaliero
- **P2**: leghe private, generazione giornaliera storie (AI + verifica umana), Web Push "sfida in scadenza", QR sulla share card, OG dinamico per sfida (Pages Function), pool 40+ storie seedato per data (stesso seed client/Functions per le leghe)
