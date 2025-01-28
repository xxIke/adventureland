// Code that should be called to start bot

if (character.ctype == "merchant") {
    load_code(12, () => { game_log("Failed to load merchant code from main"); });
    character.bot = new Merchant();
}
else {
    load_code(11, () => { game_log("Failed to load hunter code from main"); });
    character.bot = new Hunter();
}

map_key("4", "snippet", "character.bot.run_test_code()");
