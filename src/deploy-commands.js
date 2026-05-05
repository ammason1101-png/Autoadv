import { REST, Routes } from 'discord.js';

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

const commands = [
  redeemKey, help, setup, configpanel, oauthLink,
  settoken, listtokens, selecttoken, removetoken,
  tokenstart, tokenstop, tokenstatus, tokenconfig,
  ad, dashboard, status, profile, stats, leaderboard, startall,
  balance, resellerGen, transferReseller,
  togglepanel, trialDrop, adminGenkey, adminReseller
].map(cmd => cmd.data.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.');
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`🔄 Deploying ${commands.length} slash commands...`);
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log(`✅ Successfully deployed ${data.length} slash commands globally.`);
  } catch (err) {
    console.error('❌ Failed to deploy commands:', err);
  }
})();
