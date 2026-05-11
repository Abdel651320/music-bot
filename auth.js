const play = require('play-dl');

(async () => {
  await play.getFreeClientID().then((clientID) => {
    play.setToken({ soundcloud: { client_id: clientID } });
  });
})();