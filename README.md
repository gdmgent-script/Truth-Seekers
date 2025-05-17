# Truth Seekers - GitHub Pages Deployment Guide (Firebase Version)

## Overview

This guide explains how to deploy the Truth Seekers game on GitHub Pages using Firebase for real-time multiplayer functionality. This version resolves all connection issues and provides a reliable multiplayer experience across different devices.

## What You Need

- A GitHub account (only the person deploying needs this - players don't need accounts)
- A web browser (Chrome, Firefox, Safari, or Edge)
- The Truth Seekers game files (included in the zip package)

## Deployment Steps

### 1. Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Name your repository (e.g., "truth-seekers-game")
4. Make sure it's set to "Public"
5. Click "Create repository"

### 2. Upload the Game Files

1. In your new repository, click "uploading an existing file"
2. Drag and drop all the files from the zip package:
   - index.html
   - questions.json
   - Truth_seekers_logo.png
3. Click "Commit changes"

### 3. Enable GitHub Pages

1. Go to the repository "Settings" tab
2. Scroll down to "Pages" section in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Under "Branch", select "main" and "/(root)" folder
5. Click "Save"
6. Wait a few minutes for GitHub to deploy your site
7. You'll see a message with your site URL (e.g., https://yourusername.github.io/truth-seekers-game)

### 4. Share the Game

1. Copy the GitHub Pages URL
2. Share this URL with all players
3. No accounts or installations needed - just open the link in a browser!

## How to Play

### For the Host (Game Creator):

1. Open the GitHub Pages URL in your browser
2. Click "Host Game"
3. Enter your name and click "Create Game"
4. Share the displayed game code with other players
5. Wait for players to join
6. When everyone has joined, click "Start Game"
7. Enter your role code when prompted
8. Follow the on-screen instructions to play

### For Players (Joining the Game):

1. Open the GitHub Pages URL in their browser
2. Click "Join Game"
3. Enter their name and the game code
4. Click "Join Game"
5. Enter their role code when prompted
6. Follow the on-screen instructions to play

## Role Codes

The following role codes are preserved from the original implementation:

- "1288": Fakemaker
- "7523": Factchecker
- "7358": Factchecker
- "6411": Factchecker
- "9876": Factchecker
- "5432": Factchecker

## Technical Details

- This implementation uses Firebase Realtime Database for game state synchronization
- All players connect to the same Firebase database to share game state
- The Firebase configuration is already set up and ready to use
- No additional setup or configuration is required
- The free Firebase plan has more than enough capacity for casual gameplay

## Advantages of This Solution

- **Works Across Different Devices**: Players can join from any device with a browser
- **Real-Time Updates**: Changes are synchronized instantly across all devices
- **No Accounts Required**: Players don't need to create any accounts
- **No Installation**: Everything runs in the browser
- **Reliable Connection**: Uses Firebase's robust infrastructure
- **Free Hosting**: Both GitHub Pages and the Firebase plan used are completely free

## Troubleshooting

- If players can't join, make sure they're entering the correct game code
- If the game seems stuck, try refreshing the page
- Make sure all players are using a modern browser (Chrome, Firefox, Safari, Edge)
- If you encounter any issues with Firebase connectivity, check your internet connection
