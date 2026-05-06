# AutoAdv Bot

A full-featured Discord advertising automation bot with license key management, token-based ad campaigns, interactive dashboards, and a reseller system.

## Commands

| Command | Description |
|---|---|
| `/redeem_key` | Activate your account with a license key |
| `/help` | Show all commands |
| `/setup` | Quick-start guide |
| `/dashboard` | Interactive token & job management panel |
| `/ad` | Launch an ad campaign (auto-saves token) |
| `/settoken` | Add a token manually |
| `/listtokens` | List all saved tokens |
| `/selecttoken` | Set a token as active |
| `/removetoken` | Delete a token |
| `/tokenstart` | Start all jobs for a token |
| `/tokenstop` | Stop all jobs for a token |
| `/tokenstatus` | View token and job status |
| `/tokenconfig` | Configure token settings |
| `/configpanel` | Full config panel with buttons |
| `/togglepanel` | Toggle auto-reply & bypass per token |
| `/status` | Full account status |
| `/profile` | Your user profile |
| `/stats` | Ad campaign stats |
| `/leaderboard` | Top users leaderboard |
| `/startall` | Start all stopped jobs |
| `/balance` | Reseller credit balance |
| `/reseller_gen` | Generate a key with reseller credits |
| `/transfer_reseller` | Transfer credits to another reseller |
| `/trial_drop` | Drop a free trial key in channel (admin) |
| `/admin_genkey` | Generate license keys (admin) |
| `/admin_reseller` | Manage reseller accounts (admin) |

## Setup

### Option 1 — Railway (24/7 Hosting)

1. Fork or push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Add a **PostgreSQL** plugin from Railway dashboard
4. Set environment variables (see below)
5. Deploy — Railway auto-runs `node src/index.js`
6. Run command deployment once: `node src/deploy-commands.js`

### Option 2 — Local / VPS

```bash
npm install
cp .env.example .env
# Fill in .env values
node src/deploy-commands.js   # deploy slash commands once
node src/index.js             # start the bot
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application ID from Discord Developer Portal |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OWNER_IDS` | Optional | Comma-separated Discord IDs for admin commands |

## Database

The bot auto-creates its tables on first run via `src/db/schema.js`. Just provide a valid `DATABASE_URL` and it handles the rest.

For Railway: add the **Postgres** plugin and it sets `DATABASE_URL` automatically.

## Getting Started (After Deploy)

1. Set your `OWNER_IDS` to your Discord user ID
2. Run `/admin_genkey` → generate your first key
3. Run `/redeem_key <key>` in your Discord server
4. Run `/ad` with a token, message, and channels to start advertising
5. Use `/dashboard` to manage everything

## License Key Types

| Type | Duration |
|---|---|
| Trial | 3 days |
| Basic | 30 days |
| Premium | 90 days |
