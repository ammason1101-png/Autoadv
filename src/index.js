import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { restoreJobs } from './utils/adRunner.js';
import { handleButton as configPanelButton } from './commands/configpanel.js';
import { handleButton as togglePanelButton } from './commands/togglepanel.js';
import { handleInteraction as dashboardHandler } from './commands/dashboard.js';

// Import commands
import * as redeemKey from './commands/redeem_key.js';
import * as help from './commands/help.js';
import * as setup from './commands/setup.js';
import * as configpanel from './commands/configpanel.js';
import * as oauthLink from './commands/oauth_link.js';
import * as settoken from './commands/settoken.js';
import * as listtokens from './commands/listtokens.js';
import * as selecttoken from './commands/selecttoken.js';
import * as removetoken from './commands/removetoken.js';
import * as tokenstart from './commands/tokenstart.js';
import * as tokenstop from './commands/tokenstop.js';
import * as tokenstatus from './commands/tokenstatus.js';
import * as tokenconfig from './commands/tokenconfig.js';
import * as ad from './commands/ad.js';
import * as dashboard from './commands/dashboard.js';
import * as status from './commands/status.js';
import * as profile from './commands/profile.js';
import * as stats from './commands/stats.js';
import * as leaderboard from './commands/leaderboard.js';
import * as startall from './commands/startall.js';
import * as balance from './commands/balance.js';
import * as resellerGen from './commands/reseller_gen.js';
import * as transferReseller from './commands/transfer_reseller.js';
import * as togglepanel from './commands/togglepanel.js';
import * as trialDrop from './commands/trial_drop.js';
import * as adminGenkey from './commands/admin_genkey.js';
import * as adminReseller from './commands/admin_reseller.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const commands = [
  redeemKey, help, setup, configpanel, oauthLink,
  settoken, listtokens, selecttoken, removetoken,
  tokenstart, tokenstop, tokenstatus, tokenconfig,
  ad, dashboard, status, profile, stats, leaderboard, startall,
  balance, resellerGen, transferReseller,
  togglepanel, trialDrop, adminGenkey, adminReseller
];

// Register commands in collection
for (const cmd of commands) {
  if (cmd?.data?.name) {
    client.commands.set(cmd.data.name, cmd);
  }
}

// Bot ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

  try {
    await restoreJobs(client);
    console.log('🔄 Restored running ad jobs.');
  } catch (err) {
    console.error('Restore jobs error:', err);
  }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      return;
    }

    // Dashboard modals
    if (interaction.isModalSubmit() && interaction.customId.startsWith('dash_modal_')) {
      await dashboardHandler(interaction);
      return;
    }

    // Buttons / selects
    const id =
      interaction.isButton() || interaction.isStringSelectMenu()
        ? interaction.customId
        : null;

    if (!id) return;

    if (id.startsWith('dash_')) {
      await dashboardHandler(interaction);
    } else if (id.startsWith('panel_')) {
      await configPanelButton(interaction);
    } else if (id.startsWith('toggle_')) {
      await togglePanelButton(interaction);
    }

  } catch (err) {
    console.error('Interaction error:', err);

    if (interaction.isRepliable()) {
      try {
        await interaction.reply({
          content: '❌ Error occurred while processing.',
          ephemeral: true
        });
      } catch {}
    }
  }
});

// Token check
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ DISCORD_TOKEN is missing!');
  process.exit(1);
}

// Login
client.login(token);
