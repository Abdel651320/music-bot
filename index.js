require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer,
  createAudioResource, AudioPlayerStatus
} = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

const queue = new Map();

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd  = args.shift().toLowerCase();

  if (cmd === 'play') {
    const vc = message.member?.voice.channel;
    if (!vc) return message.reply('❌ Rejoins un salon vocal !');
    const query = args.join(' ');
    if (!query) return message.reply('❌ Donne un titre ou une URL !');

    try {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) return message.reply('❌ Rien trouvé.');
      const song = { title: results[0].title, url: results[0].url };

      if (!queue.has(message.guild.id))
        queue.set(message.guild.id, { songs: [], connection: null, player: null });

      const sq = queue.get(message.guild.id);
      sq.songs.push(song);
      message.reply(`🎵 Ajouté : **${song.title}**`);

      if (!sq.connection) {
        sq.connection = joinVoiceChannel({
          channelId: vc.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        playNext(message.guild.id, message.channel);
      }
    } catch (e) { console.error(e); message.reply('❌ Erreur.'); }
  }

  if (cmd === 'skip') {
    const sq = queue.get(message.guild.id);
    if (!sq) return message.reply('❌ Rien en cours.');
    sq.player?.stop();
    message.reply('⏭️ Suivant !');
  }

  if (cmd === 'stop') {
    const sq = queue.get(message.guild.id);
    if (!sq) return message.reply('❌ Rien en cours.');
    sq.songs = [];
    sq.player?.stop();
    sq.connection?.destroy();
    queue.delete(message.guild.id);
    message.reply('⏹️ Arrêté.');
  }

  if (cmd === 'queue') {
    const sq = queue.get(message.guild.id);
    if (!sq?.songs.length) return message.reply('📭 File vide.');
    const list = sq.songs.map((s,i) => `${i+1}. ${s.title}`).join('\n');
    message.reply(`🎶 File :\n${list}`);
  }
});

async function playNext(guildId, channel) {
  const sq = queue.get(guildId);
  if (!sq?.songs.length) {
    sq?.connection?.destroy();
    queue.delete(guildId);
    return;
  }
  const song = sq.songs[0];
  const stream   = await play.stream(song.url, { quality: 2 });
  const resource = createAudioResource(stream.stream, { inputType: stream.type });
  const player   = createAudioPlayer();
  sq.player = player;
  sq.connection.subscribe(player);
  player.play(resource);
  channel.send(`▶️ En cours : **${song.title}**`);
  player.on(AudioPlayerStatus.Idle, () => { sq.songs.shift(); playNext(guildId, channel); });
  player.on('error', () => { sq.songs.shift(); playNext(guildId, channel); });
}

client.login(process.env.TOKEN);