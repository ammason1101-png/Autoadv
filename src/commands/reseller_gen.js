import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { getOrCreateUser } from '../utils/checkKey.js';
import { generateKey } from '../utils/keys.js';

export const data = new SlashCommandBuilder()
  .setName('reseller_gen')
  .setDescription('Generate a key using your reseller balance')
  .addStringOption(opt =>
    opt.setName('type')
      .setDescription('Key type')
      .setRequired(true)
      .addChoices(
        { name: 'Trial (3 days)', value: 'trial' },
        { name: 'Basic (30 days)', value: 'basic' },
        { name: 'Premium (90 days)', value: 'premium' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const discordId = interaction.user.id;
  const user = await getOrCreateUser(discordId, interaction.user.username);

  if (!user.is_reseller) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Not a Reseller', footer: { text: 'AutoAdv Bot' } }]
    });
  }
  if (user.reseller_balance < 1) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Insufficient Balance',
        description: 'You don\'t have enough credits to generate a key.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  const type = interaction.options.getString('type');
  const durationMap = { trial: 3, basic: 30, premium: 90 };
  const duration = durationMap[type];
  const keyValue = generateKey();

  await query(
    `INSERT INTO license_keys (key_value, type, duration_days, created_by) VALUES ($1, $2, $3, $4)`,
    [keyValue, type, duration, discordId]
  );
  await query(
    `UPDATE users SET reseller_balance = reseller_balance - 1 WHERE discord_id = $1`,
    [discordId]
  );

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '🔑 Key Generated',
      fields: [
        { name: 'Key', value: `\`${keyValue}\``, inline: false },
        { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
        { name: 'Duration', value: `${duration} days`, inline: true },
        { name: 'Remaining Balance', value: `${user.reseller_balance - 1} credit(s)`, inline: true }
      ],
      footer: { text: 'AutoAdv Bot • Share this key with your client' }
    }]
  });
}
