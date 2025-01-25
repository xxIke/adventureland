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
        - Inventory Management
            - Take count of everything
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
        - Sales Town
            - Patrol town trying to fullfill wishlists
            - Wander servers if set
        - Sales Wander
            - Patrol the map trying to fullfill wishlists
            - Wander servers if set
        - Mine
            - solve mining
        - Fish
            - solve fishing