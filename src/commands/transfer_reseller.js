import { SlashCommandBuilder } from 'discord.js';
import { query } from '../db/index.js';
import { getOrCreateUser } from '../utils/checkKey.js';

export const data = new SlashCommandBuilder()
  .setName('transfer_reseller')
  .setDescription('Transfer reseller credits to another user')
  .addUserOption(opt =>
    opt.setName('user').setDescription('User to transfer credits to').setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('amount').setDescription('Number of credits to transfer').setRequired(true).setMinValue(1)
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

  const targetUser = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  if (targetUser.id === discordId) {
    return interaction.editReply({
      embeds: [{ color: 0xED4245, title: '❌ Cannot Transfer to Yourself', footer: { text: 'AutoAdv Bot' } }]
    });
  }
  if (user.reseller_balance < amount) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Insufficient Balance',
        description: `You only have **${user.reseller_balance}** credit(s).`,
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  const target = await getOrCreateUser(targetUser.id, targetUser.username);
  if (!target.is_reseller) {
    return interaction.editReply({
      embeds: [{
        color: 0xED4245,
        title: '❌ Target is Not a Reseller',
        description: 'You can only transfer credits to other resellers.',
        footer: { text: 'AutoAdv Bot' }
      }]
    });
  }

  await query(
    `UPDATE users SET reseller_balance = reseller_balance - $1 WHERE discord_id = $2`,
    [amount, discordId]
  );
  await query(
    `UPDATE users SET reseller_balance = reseller_balance + $1 WHERE discord_id = $2`,
    [amount, targetUser.id]
  );

  return interaction.editReply({
    embeds: [{
      color: 0x57F287,
      title: '✅ Credits Transferred',
      fields: [
        { name: 'To', value: targetUser.username, inline: true },
        { name: 'Amount', value: `${amount} credit(s)`, inline: true },
        { name: 'Your Balance', value: `${user.reseller_balance - amount} credit(s)`, inline: true }
      ],
      footer: { text: 'AutoAdv Bot' }
    }]
  });
}
