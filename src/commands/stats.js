import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { isJobRunning } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View your ad campaign statistics');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const discordId = interaction.user.id;
  const jobsRes = await query(
    `SELECT aj.*, t.token_name FROM ad_jobs aj
     JOIN tokens t ON t.id = aj.token_id
     WHERE aj.user_discord_id = $1`,
    [discordId]
  );

  const total = jobsRes.rows.length;
  const running = jobsRes.rows.filter(j => isJobRunning(j.id)).length;
  const totalChannels = jobsRes.rows.reduce((acc, j) => acc + (j.channel_ids || []).length, 0);

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: '📈 Your Stats',
      fields: [
        { name: 'Total Ad Jobs', value: total.toString(), inline: true },
        { name: 'Currently Running', value: running.toString(), inline: true },
        { name: 'Total Channels', value: totalChannels.toString(), inline: true },
        {
          name: 'Job Breakdown',
          value: jobsRes.rows.length
            ? jobsRes.rows.map(j =>
                `**#${j.id}** (${j.token_name}) — ${isJobRunning(j.id) ? '🟢' : '🔴'} — ${(j.channel_ids || []).length} ch | ${j.delay_seconds}s`
              ).slice(0, 10).join('\n')
            : 'No jobs yet.'
        }
      ],
      footer: { text: 'AutoAdv Bot' },
      timestamp: new Date().toISOString()
    }]
  });
}
