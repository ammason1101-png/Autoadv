import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { startAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('tokenstart')
  .setDescription('Start all ad jobs for a token')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to start').setRequired(true)
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
  if (!tokenRes.rows[0]) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Token Not Found', description: 'No token found with that ID.', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  const jobs = await query(
    `SELECT id FROM ad_jobs WHERE token_id = $1 AND user_discord_id = $2`,
    [tokenId, discordId]
  );

  if (!jobs.rows.length) {
    return interaction.editReply({
      embeds: [{ color: 0xFEE75C, title: '⚠️ No Jobs Found', description: 'No ad jobs exist for this token. Use `/ad` to create one.', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  let started = 0;
  for (const job of jobs.rows) {
    await query(`UPDATE ad_jobs SET is_running = TRUE WHERE id = $1`, [job.id]);
    await startAdJob(job.id, interaction.client);
    started++;
  }

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '▶️ Token Started',
      description: `Started **${started}** ad job(s) for token #${tokenId}.`,
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
