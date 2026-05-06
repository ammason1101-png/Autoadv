import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View all available commands');

export async function execute(interaction) {
  return interaction.reply({
    embeds: [{
      color: 0x5865F2,
      title: '📚 AutoAdv Bot — Commands',
      fields: [
        {
          name: '🚀 Getting Started',
          value: '`/redeem_key` `/help` `/setup` `/configpanel` `/oauth_link`'
        },
        {
          name: '🔑 Token Management *(Key Required)*',
          value: '`/settoken` `/listtokens` `/selecttoken` `/removetoken`\n`/tokenstart` `/tokenstop` `/tokenstatus` `/tokenconfig`'
        },
        {
          name: '📢 All-in-one Setup',
          value: '`/ad <token_id> <message> <channel_ids> [delay] [image1-5]`\n-# delay = seconds per full cycle. All channels sent to first, then delay starts.'
        },
        {
          name: '⚙️ Panels',
          value: '`/configpanel` · Bypass · List · Status · Profile · Start/Stop All\n`/togglepanel <token_id>` · Toggle Auto-Reply & Bypass'
        },
        {
          name: 'ℹ️ Info *(Key Required)*',
          value: '`/status` `/profile` `/stats` `/leaderboard` `/startall`'
        },
        {
          name: '💼 Reseller',
          value: '`/balance` `/reseller_gen` `/transfer_reseller`'
        }
      ],
      footer: { text: 'AutoAdv Bot • Use /redeem_key <key> to get started' }
    }],
    ephemeral: true
  });
}
