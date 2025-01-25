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
        - Having the attack/move managers helps my brain keep the kite/entity monitoring logic decooupled from other things [+]
            - Would then still want something to monitor what I should be doing and where I should be doing, ergo the state manager
- What states can the bots even be in?
    - Universal
        - idle
        - Recover
        - Evade
    - Hunters
        - Hunt Target Pack