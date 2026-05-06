import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { isJobRunning } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('tokenstatus')
  .setDescription('Check status of a token and its ad jobs')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to check').setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const tokenId = interaction.options.getInteger('token_id');
  const discordId = interaction.user.id;

  const tokenRes = await query(
    `SELECT * FROM tokens WHERE id = $1 AND user_discord_id = $2`,
    [tokenId, discordId]
  );
  const token = tokenRes.rows[0];
  if (!token) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Token Not Found', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  const jobsRes = await query(
    `SELECT * FROM ad_jobs WHERE token_id = $1`, [tokenId]
  );

  const jobLines = jobsRes.rows.map(j =>
    `**Job #${j.id}** — ${isJobRunning(j.id) ? '🟢 Running' : '🔴 Stopped'} | ${(j.channel_ids || []).length} channels | ${j.delay_seconds}s delay`
  ).join('\n') || 'No jobs found.';

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: `📊 Token Status — #${tokenId} ${token.token_name}`,
      fields: [
        { name: 'Auto-Reply', value: token.auto_reply_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Bypass', value: token.bypass_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Selected', value: token.is_selected ? '✅ Yes' : '❌ No', inline: true },
        { name: `Ad Jobs (${jobsRes.rows.length})`, value: jobLines }
      ],
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
