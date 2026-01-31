# Adventureland Bot

xxIke Bot Repo for Adventureland


## Project Layout

```
- `archive/` - Old code from previous iterations, has example code for certain problems
- `docs/` - Documentation files for the project.
- `build/` - Build releases
- `log/` - Contains log files stored by the server
- `src/` - Contains the source code for project.
- `src/Bot` - Contains code needed for the bot
- `src/Server` - Contains code needed to run external server
- `scripts/` - Utility scripts for development and deployment.
- `README.md` - Project overview and instructions.
```

## Design Overview

Bot functionality is divided into three parts: 
- `External Server`
    - Analytics of game data and bot logs (map info, node locations, monster strength/growth rates)
    - Calculate and provide pathing info to bots upon request
    - Calculate and provide targeted gear upgrades
    - Determine prioritized farming objectives for party
    - Provide visualization of analytics
    - Provide external persistence system (external to local storage)
    - Provide long term data awareness (hostile players, merchant deals, mine/fish nodes)
    - Supplement player interaction
- `Merchant`
    - Fill in for server if external functionality is lost/unavailable
    - Maintain party
        - Start/Stop bots
        - External touch point for friends
        - Continuity for actions
    - Improve gear (upgrade/compound)
    - Resupply (deliver potions/gear, collect loot)
    - Mine/Fish
    - Sales/interact with other players
    - Scout/Explore
- `<Hunter Classes>`
    - Work Target Priorities (*Should be receiving target priority from External Server/Merchant*)
        - Event (on_going && have_handler && can_handle)
        - Monster Hunt (should_hunt && can_handle)
        - Farm Material (merchant/server priority, may also provide target pack)
        - Regular Farm (default farm priority xp/gold/overflow material)

## Build

Build will provide versioned/tagged releases of bot code that can be copied over to adventureland game folder for implementation.
Build will provide the runnable server file

