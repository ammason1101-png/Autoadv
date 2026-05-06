import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { generateKey } from '../utils/keys.js';

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];
const trialCooldowns = new Map();

export const data = new SlashCommandBuilder()
  .setName('trial_drop')
  .setDescription('Drop a free trial key in this channel (Admin only)');

export async function execute(interaction) {
  if (OWNER_IDS.length && !OWNER_IDS.includes(interaction.user.id)) {
    return interaction.reply({
      embeds: [{ color: 0xED4245, title: '❌ No Permission', footer: { text: 'AutoAdv Bot' } }],
      ephemeral: true
    });
  }

  const channelId = interaction.channelId;
  const lastDrop = trialCooldowns.get(channelId);
  if (lastDrop && Date.now() - lastDrop < 3600000) {
    const remaining = Math.ceil((3600000 - (Date.now() - lastDrop)) / 60000);
    return interaction.reply({
      embeds: [{
        color: 0xFEE75C,
        title: '⏰ Cooldown Active',
        description: `Trial drop is on cooldown. Try again in **${remaining}** minute(s).`,
        footer: { text: 'AutoAdv Bot' }
      }],
      ephemeral: true
    });
  }

  const keyValue = generateKey('TRIAL');
  await query(
    `INSERT INTO license_keys (key_value, type, duration_days, created_by) VALUES ($1, 'trial', 3, $2)`,
    [keyValue, interaction.user.id]
  );
  trialCooldowns.set(channelId, Date.now());

  return interaction.reply({
    embeds: [{
      color: 0xFEE75C,
      title: '🎁 Free Trial Drop!',
      description: `A free **3-day trial** key has been dropped! First come, first served.\n\n**Key:** \`${keyValue}\`\n\nUse \`/redeem_key ${keyValue}\` to claim it!`,
      footer: { text: 'AutoAdv Bot • 1 per hour per channel' }
    }]
  });
}
