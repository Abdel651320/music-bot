require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin({ update: false })]
});

client.once('clientReady', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd  = args.shift().toLowerCase();
  const voiceChannel = message.member?.voice.channel;

  if (cmd === 'play') {
    if (!voiceChannel) return message.reply('❌ Rejoins un salon vocal !');
    const query = args.join(' ');
    if (!query) return message.reply('❌ Donne un titre ou une URL !');
    try {
      await distube.play(voiceChannel, query, { message, textChannel: message.channel });
    } catch (e) {
      console.error(e);
      message.reply('❌ Erreur : ' + e.message);
    }
  }

  if (cmd === 'skip') {
    const queue = distube.getQueue(message.guild.id);
    if (!queue) return message.reply('❌ Rien en cours.');
    try { await queue.skip(); message.reply('⏭️ Suivant !'); }
    catch (e) { message.reply('❌ Pas de musique suivante.'); }
  }

  if (cmd === 'stop') {
    const queue = distube.getQueue(message.guild.id);
    if (!queue) return message.reply('❌ Rien en cours.');
    await distube.stop(message.guild.id);
    message.reply('⏹️ Arrêté.');
  }

  if (cmd === 'queue') {
    const queue = distube.getQueue(message.guild.id);
    if (!queue) return message.reply('📭 File vide.');
    const list = queue.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} ${s.name}`).join('\n');
    message.reply(`🎶 File :\n${list}`);
  }

  if (cmd === 'pause') {
    const queue = distube.getQueue(message.guild.id);
    if (!queue) return message.reply('❌ Rien en cours.');
    queue.pause();
    message.reply('⏸️ En pause.');
  }

  if (cmd === 'resume') {
    const queue = distube.getQueue(message.guild.id);
    if (!queue) return message.reply('❌ Rien en cours.');
    queue.resume();
    message.reply('▶️ Repris !');
  }
});

distube.on('playSong', (queue, song) => {
  queue.textChannel?.send(`▶️ En cours : **${song.name}** (${song.formattedDuration})`);
});

distube.on('addSong', (queue, song) => {
  queue.textChannel?.send(`🎵 Ajouté : **${song.name}**`);
});

distube.on('error', (channel, error) => {
  console.error(error);
  channel?.send('❌ Erreur : ' + error.message);
});

client.login(process.env.TOKEN);