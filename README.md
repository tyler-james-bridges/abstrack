# Abstrack

Blockchain rhythm game on [Abstract](https://abs.xyz/). Every block is a unique song — gas sets the tempo, transactions shape the density, and the block hash seeds the scale, groove, and chord progression. Hit notes in time, build combos, and compete on the daily leaderboard.

**[Play now at abstrack.live](https://www.abstrack.live/)**

## How It Works

- **Block → Music**: Each block's on-chain data (gas used, tx count, block hash) is deterministically mapped to BPM, note patterns, scale, chord progressions, and synth parameters. Same block always produces the same song.
- **Euclidean Rhythms**: Notes are placed using Bjorklund's algorithm for mathematically even spacing — no random scatter. The block hash controls pattern rotations for variety.
- **Generative Backing Track**: Pad chords follow a progression derived from the block, bass plays Euclidean root-fifth patterns, and an arpeggiator sequences through chord tones.
- **Scoring**: Hit notes within timing windows (perfect / great / good) to build combos and climb the leaderboard. Scores are saved on-chain via Abstract Global Wallet.

## Features

- 4-lane rhythm gameplay with keyboard and touch input
- Deterministic music generation from real blockchain blocks
- Daily challenge mode with shared leaderboard
- Agent autoplay mode with configurable accuracy profiles
- On-chain score storage and high score tracking

## Local Development

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Run the development server

   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to play.

## Links

- [Abstract Docs](https://docs.abs.xyz/)
- [Abstract](https://abs.xyz/)
