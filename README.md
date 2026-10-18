# ⚽ Mini Football 2D

A small playable 2D soccer game in Persian, built with **HTML5 Canvas**, **CSS**, and **vanilla JavaScript**. No installation, dependencies or API keys are needed.

## Play locally

1. Download and unzip this repository.
2. Open `index.html` in a current desktop or mobile browser.
3. Click **شروع بازی** (Start game).

## Controls

- **W A S D** or **arrow keys**: move the blue player
- **Space**: shoot when near the ball
- **Shift**: sprint
- **R**: restart
- On touchscreens use the on-screen directional and shoot buttons.

Your goal is **on the left**, the opponent's goal is **on the right**. A game lasts 90 seconds.

## Files

```text
mini-football-2d/
├── index.html    # Web interface, scoreboard, canvas and buttons
├── style.css     # Responsive layout and visual styling
├── game.js       # Input, motion, ball physics, AI opponent and scoring
└── README.md     # Project documentation
```

## Publish with GitHub Pages

1. Create a GitHub repository (for GitHub Free, use **Public** for Pages).
2. Upload `index.html`, `style.css`, `game.js`, and `README.md` to the repository root.
3. Go to **Settings → Pages**.
4. Set **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**, then save.
5. The game is published at `https://YOUR_USERNAME.github.io/mini-football-2d/` after GitHub finishes deployment.

## Develop with OpenAI Codex

Connect the GitHub repository to Codex Cloud at <https://chatgpt.com/codex> and use this task:

> Read the existing Mini Football 2D game. Preserve working movement, shooting and scoring. Improve the opponent AI, add a start menu and make the game more fun. Keep it static-site-compatible and avoid external paid services. Explain and test your changes. Create a pull request for review.

## Current prototype scope

This is **1v1 with goalkeepers**, not an 11v11 simulation. Goalkeepers follow the ball and can save shots; the opponent chases the ball and shoots at the player's goal. A local demo is playable without a backend.

## Security

Never commit passwords, GitHub tokens or API keys to this repository. Review Codex changes before merging.
