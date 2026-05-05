import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { maskToken } from '../utils/keys.js';

export const data = new SlashCommandBuilder()
  .setName('listtokens')
  .setDescription('List all your saved tokens');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const res = await query(
    `SELECT t.*, (SELECT COUNT(*) FROM ad_jobs aj WHERE aj.token_id = t.id AND aj.is_running = TRUE) as active_jobs
     FROM tokens t WHERE t.user_discord_id = $1 ORDER BY t.id`,
    [interaction.user.id]
  );

  if (!res.rows.length) {
    return interaction.editReply({
      embeds: [{
        color: 0xFEE75C,
        title: '📋 No Tokens',
        description: 'You have no tokens added yet.\nUse `/settoken` to add one.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  const fields = res.rows.map(t => ({
    name: `${t.is_selected ? '🟢' : '⚫'} #${t.id} — ${t.token_name}`,
    value: [
      `Token: \`${maskToken(t.token_value)}\``,
      `Auto-Reply: ${t.auto_reply_enabled ? '✅' : '❌'} | Bypass: ${t.bypass_enabled ? '✅' : '❌'}`,
      `Active Jobs: ${t.active_jobs}`
    ].join('\n')
  }));

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: `📋 Your Tokens (${res.rows.length})`,
      fields: fields.slice(0, 25),
      footer: { text: 'AutoAdv Bot • 🟢 = selected token' }
    }]
  });
}
