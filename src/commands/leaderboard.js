import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the leaderboard of top users by active ad jobs');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const res = await query(`
    SELECT u.discord_id, u.username,
      COUNT(DISTINCT t.id) as token_count,
      COUNT(DISTINCT aj.id) as job_count
    FROM users u
    LEFT JOIN tokens t ON t.user_discord_id = u.discord_id
    LEFT JOIN ad_jobs aj ON aj.user_discord_id = u.discord_id AND aj.is_running = TRUE
    WHERE u.key_id IS NOT NULL
    GROUP BY u.discord_id, u.username
    ORDER BY job_count DESC, token_count DESC
    LIMIT 10
  `);

  const medals = ['🥇', '🥈', '🥉'];
  const lines = res.rows.map((r, i) =>
    `${medals[i] || `**${i + 1}.**`} ${r.username || `User ${r.discord_id.slice(-4)}`} — ${r.job_count} running jobs | ${r.token_count} tokens`
  ).join('\n') || 'No users yet.';

  return interaction.editReply({
    embeds: [{
      color: 0xFEE75C,
      title: '🏆 Leaderboard — Top Users',
      description: lines,
      footer: { text: 'AutoAdv Bot • Ranked by active ad jobs' }
    }]
  });
}
