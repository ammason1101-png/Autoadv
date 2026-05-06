import { SlashCommandBuilder } from 'discord.js';
import { requireKey } from '../utils/checkKey.js';
import { query } from '../db/index.js';
import { formatExpiry } from '../utils/keys.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View your user profile');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = await requireKey(interaction);
  if (!user) return;

  const discordId = interaction.user.id;
  const tokenCount = await query(`SELECT COUNT(*) as c FROM tokens WHERE user_discord_id = $1`, [discordId]);
  const jobCount = await query(`SELECT COUNT(*) as c FROM ad_jobs WHERE user_discord_id = $1`, [discordId]);

  return interaction.editReply({
    embeds: [{
      color: 0x5865F2,
      title: `👤 Profile — ${interaction.user.username}`,
      thumbnail: { url: interaction.user.displayAvatarURL() },
      fields: [
        { name: 'Discord ID', value: discordId, inline: true },
        { name: 'License Type', value: user.type || 'basic', inline: true },
        { name: 'Reseller', value: user.is_reseller ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Expires', value: formatExpiry(user.expires_at), inline: true },
        { name: 'Tokens', value: tokenCount.rows[0].c.toString(), inline: true },
        { name: 'Ad Jobs', value: jobCount.rows[0].c.toString(), inline: true },
        { name: 'Member Since', value: `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:D>`, inline: true }
      ],
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
