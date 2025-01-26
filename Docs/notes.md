# Notes

Collecting some notes/questions here to be answered. Either through code or documentation.


## ToDo


## State Management

- State_manager vs attack/move_manager 's
    - Should I have all three? One side or the other?
    - Is there a meaningful difference between these?
        - State could just be monitoring the need to transition between states?
            - For hunters it would server this purpose, but for the merchant I the attack/move drop out
        - Noted above the attack/move doesn't apply to merchant
            - Actually I think this is replaced by fullfilling wishlists...
        - Having the attack/move managers helps my brain keep the kite/entity monitoring logic decooupled from other things [+]
            - Would then still want something to monitor what I should be doing and where I should be doing, ergo the state manager
- What states can the bots even be in?
    - Universal
        - idle
            - Party Up
            - Recover state
            - Rally?
        - Recover
            - Rally
            - Regen
        - Evade
            - RUN!!!!
        - Transit
    - Hunters
        - Hunt Target Pack
            - Get to target pack
            - If rally, wait for party 
            - Attack!
        - Event
            - Solve the event
    - Merchant
        - Event
            - Task the event?
                - I think the Merchant could be responsible for unloading/loading party members to tackle certain events as needed. This functionality could also be accomplished for hunting specific targets. 
        - Inventory Management
            - Take count of everything
            - Task hunt party appropriately
        - Compound
            - Grab things you can compound
            - Compound
        - Upgrade
            - Grab things you can upgrade
            - Upgrade
        - Restock
            - Grab stock
            - Get to party
            - Fullfill wishlist
            - Grab junk
        - Sales
            - Attempt to trade with players based on criteria
            - Configurations for
                - Stay in town or wander to farm locations
                - Stay on server or wander servers
        - Mine
            - solve mining
        - Fish
            - solve fishing

- Rather than a field that tracks current state, should I have a field that tracks the state of all states? To help facilite decisions on when to switch. (e.g. as a merchant I see I'm about to swap back to inv_mgmt but I just did that a minute ago....)