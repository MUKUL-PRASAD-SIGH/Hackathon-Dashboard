let audioUnlocked = false;

const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(0);
  oscillator.stop(ctx.currentTime + 0.01);
};

export const enableNotificationSound = () => {
  const handler = () => {
    unlockAudio();
    window.removeEventListener('click', handler);
    window.removeEventListener('keydown', handler);
  };

  window.addEventListener('click', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
};

export const playNotificationSound = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.12);

  oscillator.onended = () => {
    ctx.close();
  };
};
