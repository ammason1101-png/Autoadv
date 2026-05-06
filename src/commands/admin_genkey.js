import { SlashCommandBuilder } from 'discord.js';
import { generateKey } from '../utils/keys.js';
import { query } from '../db/index.js';

const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];

export const data = new SlashCommandBuilder()
  .setName('admin_genkey')
  .setDescription('[Admin] Generate a license key')
  .addStringOption(opt =>
    opt.setName('type')
      .setDescription('Key type')
      .setRequired(true)
      .addChoices(
        { name: 'Trial (3 days)', value: 'trial' },
        { name: 'Basic (30 days)', value: 'basic' },
        { name: 'Premium (90 days)', value: 'premium' }
      )
  )
  .addIntegerOption(opt =>
    opt.setName('amount').setDescription('Number of keys to generate (max 10)').setRequired(false).setMinValue(1).setMaxValue(10)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (OWNER_IDS.length && !OWNER_IDS.includes(interaction.user.id)) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Admin Only', footer: { text: 'AutoAdv Bot' } }]
    });
  }

  const type = interaction.options.getString('type');
  const amount = interaction.options.getInteger('amount') || 1;
  const durationMap = { trial: 3, basic: 30, premium: 90 };
  const duration = durationMap[type];

  const keys = [];
  for (let i = 0; i < amount; i++) {
    const k = generateKey();
    await query(
      `INSERT INTO license_keys (key_value, type, duration_days, created_by) VALUES ($1, $2, $3, $4)`,
      [k, type, duration, interaction.user.id]
    );
    keys.push(k);
  }

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: `🔑 Generated ${amount} Key(s)`,
      description: keys.map(k => `\`${k}\``).join('\n'),
      fields: [
        { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
        { name: 'Duration', value: `${duration} days`, inline: true }
      ],
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
