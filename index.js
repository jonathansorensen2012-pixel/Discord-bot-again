const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1495154030618349588';
const GUILD_ID = '1488215218667655278';

const STAFF_ROLE_ID = '1488217697505247523';
const QUEUE_PING_ROLE_ID = '1488217759988060230';
const RESTRICTED_ROLE_ID = '1495177988780720228';
const QUEUE_CHANNEL_ID = '1495184272527593542';
const TICKET_CATEGORY_ID = '1495180848473964724';
const RESULTS_CHANNEL_ID = '1488221571972599819';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const REGION_CHOICES = [
  { name: 'EU', value: 'EU' },
  { name: 'NA', value: 'NA' },
];

const TIER_CHOICES = [
  { name: 'sword', value: 'sword' },
  { name: 'axe', value: 'axe' },
  { name: 'mace', value: 'mace' },
  { name: 'uhc', value: 'uhc' },
  { name: 'netheritepot', value: 'netheritepot' },
  { name: 'pot', value: 'pot' },
  { name: 'smp', value: 'smp' },
  { name: 'vanilla', value: 'vanilla' },
];

const TIER_ROLE_GROUPS = [
  {
    sword: '1488218674719359016',
    axe: '1488218784291360879',
    mace: '1488218809301991425',
    uhc: '1488218936276160543',
    netheritepot: '1488219010402353153',
    pot: '1488219137246232596',
    smp: '1488219177880653996',
    vanilla: '1488219259887685642',
  },
  {
    sword: '1488218631799181404',
    axe: '1488219448656527554',
    mace: '1488219480621318185',
    uhc: '1488219643641593948',
    netheritepot: '1488219725023678625',
    pot: '1488219783114653696',
    smp: '1488219811107438854',
    vanilla: '1488219847706808440',
  },
  {
    sword: '1488218551662805235',
    axe: '1488219934260465715',
    mace: '1488219967278157954',
    uhc: '1488219995069616189',
    netheritepot: '1488220025872580608',
    pot: '1488220063457874140',
    smp: '1488220087453351967',
    vanilla: '1488220123260125416',
  },
  {
    sword: '1488218449678438550',
    axe: '1488220160102895696',
    mace: '1488220184203493437',
    uhc: '1488220214851145838',
    netheritepot: '1488220242709713047',
    pot: '1488220274955391066',
    smp: '1488220308526862346',
    vanilla: '1488220336389488892',
  },
  {
    sword: '1488218377276227594',
    axe: '1488220377925681373',
    mace: '1488220401434624082',
    uhc: '1488220421080748212',
    netheritepot: '1488220449103151134',
    pot: '1488220489934573628',
    smp: '1488220530254549062',
    vanilla: '1488220558171836656',
  },
];

const queueState = {
  EU: { users: [], messageId: null },
  NA: { users: [], messageId: null },
};

const strikesDb = new Map();
const verifiedUsers = new Map();

// Load verified users data
try {
  const verifiedData = JSON.parse(fs.readFileSync('verified.json', 'utf8'));
  Object.entries(verifiedData).forEach(([userId, data]) => {
    verifiedUsers.set(userId, data);
  });
  console.log('Verified users loaded.');
} catch (err) {
  console.log('No verified.json found or error reading it.');
}

// Load strikes data
try {
  const strikesData = JSON.parse(fs.readFileSync('strikes.json', 'utf8'));
  Object.entries(strikesData).forEach(([userId, count]) => {
    strikesDb.set(userId, count);
  });
  console.log('Strikes data loaded.');
} catch (err) {
  console.log('No strikes.json found or error reading it.');
}

function saveData() {
  fs.writeFileSync('strikes.json', JSON.stringify(Object.fromEntries(strikesDb), null, 2));
  fs.writeFileSync('verified.json', JSON.stringify(Object.fromEntries(verifiedUsers), null, 2));
  fs.writeFileSync('queue.json', JSON.stringify(queueState, null, 2));
}

const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('verify to a Minecraft account'),

  new SlashCommandBuilder()
    .setName('results')
    .setDescription('closes a ticket and gives a tier to a user')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(option =>
      option.setName('tiergroup').setDescription('Tier group 1-5').setRequired(true).addChoices(
        { name: '1', value: 1 },
        { name: '2', value: 2 },
        { name: '3', value: 3 },
        { name: '4', value: 4 },
        { name: '5', value: 5 },
      )
    )
    .addStringOption(option =>
      option.setName('newtier').setDescription('New tier').setRequired(true).addChoices(...TIER_CHOICES)
    )
    .addUserOption(option => option.setName('tester').setDescription('Tester').setRequired(true))
    .addStringOption(option => option.setName('score').setDescription('Score').setRequired(true)),

  new SlashCommandBuilder()
    .setName('restrict')
    .setDescription('restrict a user')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unrestrict')
    .setDescription('unrestricts a user')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),

  new SlashCommandBuilder()
    .setName('openqueue')
    .setDescription('opens a queue in a specific region')
    .addStringOption(option =>
      option.setName('region').setDescription('Region').setRequired(true).addChoices(...REGION_CHOICES)
    ),

  new SlashCommandBuilder()
    .setName('closequeue')
    .setDescription('closes queue for a specific region')
    .addStringOption(option =>
      option.setName('region').setDescription('Region').setRequired(true).addChoices(...REGION_CHOICES)
    ),

  new SlashCommandBuilder()
    .setName('next')
    .setDescription('gets the next user you want to test')
    .addStringOption(option =>
      option.setName('region').setDescription('Region').setRequired(true).addChoices(...REGION_CHOICES)
    ),

  new SlashCommandBuilder()
    .setName('closetest')
    .setDescription('closes the current test'),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('gathers info on a user')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),

  new SlashCommandBuilder()
    .setName('strikes')
    .setDescription('view or set strikes for a tester')
    .addUserOption(option => option.setName('user').setDescription('Tester').setRequired(true))
    .addIntegerOption(option => option.setName('set').setDescription('Set strike amount').setRequired(false)),

  new SlashCommandBuilder()
    .setName('removequeue')
    .setDescription('removes a user from a queue')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addStringOption(option =>
      option.setName('region').setDescription('Region').setRequired(true).addChoices(...REGION_CHOICES)
    ),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('makes the bot say a message in a channel')
    .addChannelOption(option => option.setName('channel').setDescription('Channel').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Message').setRequired(true)),

  new SlashCommandBuilder()
    .setName('updateusername')
    .setDescription('changes this persons nickname on the server')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addStringOption(option => option.setName('username').setDescription('New nickname').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

function hasStaffAccess(member) {
  return member.roles.cache.has(STAFF_ROLE_ID);
}

function getAllTierRoleIds() {
  return TIER_ROLE_GROUPS.flatMap(group => Object.values(group));
}

async function fetchGuildMember(guild, userId) {
  return guild.members.fetch(userId);
}

function formatQueueUsers(region) {
  const users = queueState[region].users;
  if (!users.length) return 'No one is in queue yet.';
  return users.map((id, index) => `${index + 1}. <@${id}>`).join('\n');
}

function buildQueueEmbed(region) {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle(`${region} Queue Open`)
    .setDescription([
      `Queue is now open for ${region}. Use the buttons below.`,
      '',
      `Queue (${queueState[region].users.length}/20)`,
      formatQueueUsers(region),
    ].join('\n'));
}

function buildQueueButtons(region) {
  const isFull = queueState[region].users.length >= 20;

  const joinButton = new ButtonBuilder()
    .setCustomId(`join_queue_${region}`)
    .setLabel(`Join ${region} Queue`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFull);

  const leaveButton = new ButtonBuilder()
    .setCustomId(`leave_queue_${region}`)
    .setLabel(`Leave ${region} Queue`)
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(joinButton, leaveButton);
}

async function findQueueMessage(region) {
  const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID);
  const messages = await queueChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;

  return messages.find(msg =>
    msg.author.id === client.user.id &&
    msg.embeds.length > 0 &&
    msg.embeds[0].title === `${region} Queue Open`
  ) || null;
}

async function updateQueueMessage(region) {
  const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID);
  let message = null;

  if (queueState[region].messageId) {
    message = await queueChannel.messages.fetch(queueState[region].messageId).catch(() => null);
  }

  if (!message) {
    message = await findQueueMessage(region);
    queueState[region].messageId = message ? message.id : null;
  }

  if (!message) return;

  try {
    await message.edit({
      content: `<@&${QUEUE_PING_ROLE_ID}>`,
      embeds: [buildQueueEmbed(region)],
      components: [buildQueueButtons(region)],
    });
  } catch (error) {
    if (error.code === 10008) {
      queueState[region].messageId = null;
      return;
    }
    throw error;
  }
}

client.once('clientReady', () => {
  console.log(`Bot is online as ${client.user.tag}`);

  setInterval(async () => {
    for (const region of Object.keys(queueState)) {
      try {
        await updateQueueMessage(region);
      } catch (error) {
        console.error(`Queue refresh error for ${region}:`, error);
      }
    }
  }, 10000);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'verify_modal') {
        const minecraftUsername = interaction.fields.getTextInputValue('minecraft_username').trim();
        const region = interaction.fields.getTextInputValue('region').trim().toUpperCase();

        if (region !== 'NA' && region !== 'EU') {
          await interaction.reply({
            content: 'Region must be NA or EU.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        verifiedUsers.set(interaction.user.id, {
          minecraftUsername,
          region,
        });
        saveData(); // Save verified data here

        await interaction.reply({
          content: `Verified.\nMinecraft username: ${minecraftUsername}\nRegion: ${region}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('join_queue_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const region = interaction.customId.replace('join_queue_', '');

        if (queueState[region].users.includes(interaction.user.id)) {
          await interaction.editReply('You are already in that queue.');
          return;
        }

        if (queueState[region].users.length >= 20) {
          await interaction.editReply('That queue is full.');
          return;
        }

        queueState[region].users.push(interaction.user.id);
        saveData(); // Save queue after join
        await updateQueueMessage(region);

        await interaction.editReply(`You joined the ${region} queue.`);
        return;
      }

      if (interaction.customId.startsWith('leave_queue_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const region = interaction.customId.replace('leave_queue_', '');
        const before = queueState[region].users.length;

        queueState[region].users = queueState[region].users.filter(id => id !== interaction.user.id);
        saveData(); // Save queue after leave
        await updateQueueMessage(region);

        if (queueState[region].users.length === before) {
          await interaction.editReply(`You were not in the ${region} queue.`);
          return;
        }

        await interaction.editReply(`You left the ${region} queue.`);
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verify') {
      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('Verify Minecraft Account');

      const usernameInput = new TextInputBuilder()
        .setCustomId('minecraft_username')
        .setLabel('Minecraft username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const regionInput = new TextInputBuilder()
        .setCustomId('region')
        .setLabel('Region (NA or EU)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(usernameInput);
      const row2 = new ActionRowBuilder().addComponents(regionInput);

      modal.addComponents(row1, row2);

      await interaction.showModal(modal);
      return;
    }

    const member = await fetchGuildMember(interaction.guild, interaction.user.id);

    if (!hasStaffAccess(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === 'say') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      await channel.send(message);
      await interaction.editReply('Message sent.');
      return;
    }

    if (interaction.commandName === 'restrict') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const target = await fetchGuildMember(interaction.guild, user.id);
      await target.roles.add(RESTRICTED_ROLE_ID);
      await interaction.editReply(`Restricted ${user.tag}.`);
      return;
    }

    if (interaction.commandName === 'unrestrict') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const target = await fetchGuildMember(interaction.guild, user.id);
      await target.roles.remove(RESTRICTED_ROLE_ID);
      await interaction.editReply(`Unrestricted ${user.tag}.`);
      return;
    }

    if (interaction.commandName === 'openqueue') {
      await interaction.deferReply();

      const region = interaction.options.getString('region');
      const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID);

      queueState[region].users = [];

      const oldQueueMessage = await findQueueMessage(region);
      if (oldQueueMessage) {
        await oldQueueMessage.delete().catch(() => null);
      }
      queueState[region].messageId = null;

      const message = await queueChannel.send({
        content: `<@&${QUEUE_PING_ROLE_ID}>`,
        embeds: [buildQueueEmbed(region)],
        components: [buildQueueButtons(region)],
      });

      queueState[region].messageId = message.id;

      await interaction.editReply(`Opened ${region} queue.`);
      return;
    }

    if (interaction.commandName === 'closequeue') {
      await interaction.deferReply();

      const region = interaction.options.getString('region');
      queueState[region].users = [];

      let deleted = false;

      if (queueState[region].messageId) {
        const queueChannel = await client.channels.fetch(QUEUE_CHANNEL_ID);
        const knownMessage = await queueChannel.messages.fetch(queueState[region].messageId).catch(() => null);
        if (knownMessage) {
          await knownMessage.delete().catch(() => null);
          deleted = true;
        }
        queueState[region].messageId = null;
      }

      if (!deleted) {
        const foundMessage = await findQueueMessage(region);
        if (foundMessage) {
          await foundMessage.delete().catch(() => null);
          deleted = true;
        }
      }

      await interaction.editReply(
        deleted
          ? `Closed ${region} queue and deleted the queue message.`
          : `Closed ${region} queue. No active queue message was found.`
      );
      return;
    }

    if (interaction.commandName === 'next') {
      await interaction.deferReply();

      const region = interaction.options.getString('region');
      const nextUserId = queueState[region].users.shift();

      if (!nextUserId) {
        await interaction.editReply(`No users are in the ${region} queue.`);
        return;
      }

      saveData(); // Save queue after shift
      await updateQueueMessage(region);

      const targetUser = await client.users.fetch(nextUserId);
      const safeName = targetUser.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'user';

      const ticketChannel = await interaction.guild.channels.create({
        name: `test-${safeName}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: targetUser.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: STAFF_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      await ticketChannel.send({
        content: `<@${targetUser.id}> <@&${STAFF_ROLE_ID}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle('Test Ticket Created')
            .setDescription([
              `Tester: <@${interaction.user.id}>`,
              `User: <@${targetUser.id}>`,
              `Region: ${region}`,
            ].join('\n')),
        ],
      });

      await interaction.editReply(`Created test ticket for ${targetUser.tag}: ${ticketChannel}`);
      return;
    }

    if (interaction.commandName === 'closetest') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply('Closing ticket...');
      await interaction.channel.delete();
      return;
    }

    if (interaction.commandName === 'removequeue') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const region = interaction.options.getString('region');

      queueState[region].users = queueState[region].users.filter(id => id !== user.id);
      saveData(); // Save queue after removal
      await updateQueueMessage(region);

      await interaction.editReply(`Removed ${user.tag} from the ${region} queue.`);
      return;
    }

    if (interaction.commandName === 'strikes') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const setValue = interaction.options.getInteger('set');

      if (setValue !== null) {
        strikesDb.set(user.id, setValue);
        saveData(); // Save strikes after set
        await interaction.editReply(`Set strikes for ${user.tag} to ${setValue}.`);
        return;
      }

      const current = strikesDb.get(user.id) ?? 0;
      await interaction.editReply(`${user.tag} has ${current} strike(s).`);
      return;
    }

    if (interaction.commandName === 'info') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const target = await fetchGuildMember(interaction.guild, user.id);
      const strikeCount = strikesDb.get(user.id) ?? 0;
      const verified = verifiedUsers.get(user.id);
      const tierRoles = target.roles.cache
        .filter(role => getAllTierRoleIds().includes(role.id))
        .map(role => role.name)
        .join(', ') || 'None';

      await interaction.editReply([
        `User: ${user.tag}`,
        `Nickname: ${target.nickname || 'None'}`,
        `Minecraft username: ${verified?.minecraftUsername || 'Not verified'}`,
        `Region: ${verified?.region || 'Not verified'}`,
        `Tier roles: ${tierRoles}`,
        `Strikes: ${strikeCount}`,
      ].join('\n'));
      return;
    }

    if (interaction.commandName === 'updateusername') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const username = interaction.options.getString('username');
      const target = await fetchGuildMember(interaction.guild, user.id);
      await target.setNickname(username);
      await interaction.editReply(`Updated ${user.tag}'s nickname to ${username}.`);
      return;
    }

    if (interaction.commandName === 'results') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const tierGroup = interaction.options.getInteger('tiergroup');
      const newTier = interaction.options.getString('newtier');
      const tester = interaction.options.getUser('tester');
      const score = interaction.options.getString('score');

      const target = await fetchGuildMember(interaction.guild, user.id);
      const verified = verifiedUsers.get(user.id);
      const previousRoles = target.roles.cache
        .filter(role => getAllTierRoleIds().includes(role.id))
        .map(role => role.name)
        .join(', ') || 'None';

      const newRoleId = TIER_ROLE_GROUPS[tierGroup - 1][newTier];
      await target.roles.add(newRoleId);

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`${user.username}'s Test Results`)
        .addFields(
          { name: 'Tester', value: `<@${tester.id}>`, inline: false },
          { name: 'Region', value: verified?.region || 'Unknown', inline: false },
          { name: 'Minecraft IGN', value: verified?.minecraftUsername || 'Not verified', inline: false },
          { name: 'Previous Tier', value: previousRoles, inline: false },
          { name: 'Tier Earned', value: `${newTier} ${tierGroup}`, inline: false },
          { name: 'Score', value: score, inline: false },
        );

      const resultsChannel = await client.channels.fetch(RESULTS_CHANNEL_ID);

      if (!resultsChannel || !resultsChannel.isTextBased()) {
        await interaction.editReply('Results channel not found or not a text channel.');
        return;
      }

      await resultsChannel.send({
        content: `<@${user.id}>`,
        embeds: [embed],
      });

      await interaction.editReply('Sent results to the results channel.');
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'There was an error running this command.',
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.deferred && !interaction.replied) {
      await interaction.editReply('There was an error running this command.').catch(() => null);
    }
  }
});

async function main() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log('Commands registered!');
    await client.login(TOKEN);
  } catch (error) {
    console.error('Startup error:', error);
  }
}

main();
