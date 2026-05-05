import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { startAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('startall')
  .setDescription('Start all your stopped ad jobs at once');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const discordId = interaction.user.id;
  const jobsRes = await query(
    `SELECT id FROM ad_jobs WHERE user_discord_id = $1 AND is_running = FALSE`,
    [discordId]
  );

  if (!jobsRes.rows.length) {
    return interaction.editReply({
      embeds: [{
        color: 0xFEE75C,
        title: '⚠️ No Stopped Jobs',
        description: 'All your jobs are already running or you have no jobs.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  for (const job of jobsRes.rows) {
    await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [job.id]);
    await startAdJob(job.id, interaction.client);
  }

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '▶️ All Jobs Started',
      description: `Started **${jobsRes.rows.length}** ad job(s).`,
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
