
# Project Title: TBD

## Group Members
- **Alton Liu**  
  📧 alton.liu@mail.utoronto.ca  
  💻 GitHub: `liualton`

- **Jeremy Neilson**  
  📧 jeremy.neilson@mail.utoronto.ca  
  💻 GitHub: `neilso14`

- **Juno Zhang**  
  📧 juno.zhang@mail.utoronto.ca  
  💻 GitHub: `zha11325`

---

## Technical Specs
- **Framework:** Angular.js  
- **Backend API:** Express.js  
- **Database:** PostgreSQL  
- **Deployment:** Docker, Docker Compose, and Git Action for CI  
- **Authentication:** OAuth 2.0

---

## Overview
**TBD** is an online party game where players compete in a series of minigames to accumulate points and win.

Game lobbies and administration are controlled through a **desktop instance**, and players connect to the game using their **phones as gaming controllers**. Each minigame will feature a slightly different control scheme to complement its rules, and minigame details will be displayed on the desktop screen.

---

## Security and Payment Requirement
- **Free accounts:** Can create **1 game lobby per day**.
- **Paid monthly accounts:** Can create **unlimited game lobbies**.

---

## Additional Requirements
> “A piece of the application is *real-time*, which means it can reflect other user changes without refreshing.”

The desktop screen will display current information about the minigame, while users interact using their phone controllers in real time to progress towards the game's objective.

---

## Milestones

### Alpha
- Working prototype with simple graphics
- Game lobby creation
- Player joining
- Demo minigame implemented with real-time communication between devices

### Beta
- Improved graphics
- 1–2 fully functioning minigames
- Integration of device features (gyroscope or accelerometer)
- Stripe payment system
- Paid vs. free account functionality

### Final
- 3 fully developed minigames

---

## Minigame Ideas

### Demo Game: *Magic Numbers*
Players enter a number (1–64) on their phones. The desktop guesses a “magic number”, and the player with the closest guess wins.

### Game 1: *Load Balancing*
Players use their phone’s **gyroscope** to balance falling objects on a platform. The player with the most objects remaining at the end of the timer wins.

### Game 2: *Throw and Catch*
Players use their phone’s **accelerometer** to simulate throwing a ball towards a target. The closest throw to the target wins.

### Game 3: *Math Blitz*
Players are presented with a series of simple math equations on their phones. The player who solves the most correctly within the time limit wins.
