import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { formatExpiry, maskToken } from '../utils/keys.js';
import { isJobRunning } from '../utils/adRunner.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('View your full account and job status');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const discordId = interaction.user.id;
  const tokensRes = await query(`SELECT * FROM tokens WHERE user_discord_id = $1`, [discordId]);
  const jobsRes = await query(`SELECT * FROM ad_jobs WHERE user_discord_id = $1`, [discordId]);
  const runningJobs = jobsRes.rows.filter(j => isJobRunning(j.id));

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: '📊 Your Status',
      fields: [
        { name: 'License', value: `${user.type || 'basic'} — Expires ${formatExpiry(user.expires_at)}`, inline: false },
        { name: 'Tokens', value: `${tokensRes.rows.length} saved`, inline: true },
        { name: 'Total Jobs', value: `${jobsRes.rows.length}`, inline: true },
        { name: 'Running Jobs', value: `${runningJobs.length}`, inline: true },
        {
          name: 'Active Tokens',
          value: tokensRes.rows.length
            ? tokensRes.rows.map(t => `${t.is_selected ? '🟢' : '⚫'} #${t.id} ${t.token_name}`).join('\n')
            : 'None'
        }
      ],
      footer: { text: 'AutoAdv Bot' },
      timestamp: new Date().toISOString()
    }]
  });
}
