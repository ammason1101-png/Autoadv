import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { stopAdJob } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('tokenstop')
  .setDescription('Stop all ad jobs for a token')
  .addIntegerOption(opt =>
    opt.setName('token_id').setDescription('Token ID to stop').setRequired(true)
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

  for (const job of jobs.rows) {
    await stopAdJob(job.id);
  }

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '⏹️ Token Stopped',
      description: `Stopped **${jobs.rows.length}** ad job(s) for token #${tokenId}.`,
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
