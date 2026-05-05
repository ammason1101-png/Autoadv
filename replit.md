# AutoAdv Bot

A full-featured Discord advertising automation bot with license key management, token management, auto-ad campaigns, config panels, and a reseller system.

## Architecture

- **Runtime**: Node.js 20, ESM modules
- **Framework**: discord.js v14 (slash commands)
- **Database**: PostgreSQL (Replit managed)
- **Entry**: `src/index.js`

## Project Structure

```
src/
  index.js              # Main bot entry + interaction router
  deploy-commands.js    # Deploy slash commands to Discord API
  db/
    index.js            # PostgreSQL pool
  utils/
    keys.js             # Key generation, token masking, channel parsing
    checkKey.js         # License enforcement middleware
    adRunner.js         # In-memory ad job scheduler (per-job loop)
  commands/
    redeem_key.js       # Redeem license key
    help.js             # Command list
    setup.js            # Quick-start guide
    configpanel.js      # Interactive panel with buttons
    oauth_link.js       # Bot invite link
    settoken.js         # Add Discord token
    listtokens.js       # List tokens
    selecttoken.js      # Select active token
    removetoken.js      # Delete token
    tokenstart.js       # Start all jobs for a token
    tokenstop.js        # Stop all jobs for a token
    tokenstatus.js      # Token + job status
    tokenconfig.js      # Configure token settings
    ad.js               # All-in-one ad campaign setup
    status.js           # Full account status
    profile.js          # User profile
    stats.js            # Ad campaign statistics
    leaderboard.js      # Top users leaderboard
    startall.js         # Start all stopped jobs
    balance.js          # Reseller balance
    reseller_gen.js     # Generate keys using reseller credits
    transfer_reseller.js # Transfer reseller credits
    togglepanel.js      # Toggle auto-reply/bypass per token
    trial_drop.js       # Drop public trial key in channel
    admin_genkey.js     # Admin: generate keys
    admin_reseller.js   # Admin: manage resellers
```

## Database Tables

- `users` — Discord users, license links, reseller status
- `license_keys` — Key values, types, expiry, used_by
- `tokens` — Per-user Discord tokens with auto-reply/bypass flags
- `ad_jobs` — Ad campaigns: message, channels, delay, images, running state

## Environment Variables Required

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application/Client ID for deploying commands |
| `OWNER_IDS` | Comma-separated Discord IDs for admin commands (optional) |
| `DATABASE_URL` | Auto-set by Replit PostgreSQL |

## Setup Flow

1. Set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in Secrets
2. Start the "Start Bot" workflow — bot comes online
3. Run "Deploy Commands" workflow to register slash commands with Discord
4. Use `/admin_genkey` to create your first license key
5. Use `/redeem_key` to activate an account

## Key Types

| Type | Duration |
|---|---|
| trial | 3 days |
| basic | 30 days |
| premium | 90 days |

## Ad Runner

Ad jobs run in-memory using async loops per job. On bot restart, all `is_running=TRUE` jobs in the DB are automatically restored. Each job cycles through all channels, waits for the configured delay, then repeats.
