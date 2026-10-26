# Audio guide (studio voice)

The site speaks with the browser's built-in voice by default. To use a studio voice
(for example ElevenLabs "Jarvis-like" British male), generate one MP3 per place and
drop the files into this folder. The player picks them up automatically and only
falls back to the browser voice when a file is missing.

File names (one per place id in `js/places.js`):

```
welcome.mp3
yasawi.mp3  hilvet.mp3  rabiga.mp3  kultobe.mp3  hamam.mp3  museum.mp3
karavan.mp3  yurt.mp3  bazaar.mp3  kitchen.mp3  tulips.mp3  aksu.mp3
arystanbab.mp3  sauran.mp3  otrar.mp3  sayram.mp3
```

The exact scripts are in `script.txt` (generated from `js/places.js`).
Recommended: 44.1 kHz, mono, 96–128 kbps, −16 LUFS, a calm British male voice, pace ~150 wpm.
