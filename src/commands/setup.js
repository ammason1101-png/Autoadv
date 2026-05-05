import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { formatExpiry } from '../utils/keys.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('View your account setup and quick-start guide');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const tokenRes = await query(
    `SELECT COUNT(*) as count FROM tokens WHERE user_discord_id = $1`, [interaction.user.id]
  );
  const tokenCount = parseInt(tokenRes.rows[0].count);
  const jobRes = await query(
    `SELECT COUNT(*) as count FROM ad_jobs WHERE user_discord_id = $1 AND is_running = TRUE`,
    [interaction.user.id]
  );
  const activeJobs = parseInt(jobRes.rows[0].count);

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: '⚙️ Account Setup',
      description: 'Here\'s your quick-start guide to get up and running.',
      fields: [
        {
          name: '📋 Your Status',
          value: [
            `**Tokens Added:** ${tokenCount}`,
            `**Active Ad Jobs:** ${activeJobs}`,
            `**License Type:** ${user.type || 'basic'}`,
            `**Expires:** ${formatExpiry(user.expires_at)}`
          ].join('\n')
        },
        {
          name: '📖 Quick Start',
          value: [
            '**1.** Add a token with `/settoken`',
            '**2.** Select it with `/selecttoken`',
            '**3.** Launch ads with `/ad`',
            '**4.** Manage everything via `/configpanel`'
          ].join('\n')
        }
      ],
      footer: { text: 'AutoAdv Bot • Use /help for all commands' }
    }]
  });
}
