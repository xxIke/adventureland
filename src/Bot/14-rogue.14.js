/**
 * 14 - Rogue Class
 * 
 * Extended Hunter for Rogue Functionality
 * 
 */

class Rogue extends Hunter {
    constructor() {
        super();
        this.log.info(`Rogue ${character.name} created`);
    }

    init() {
        super.init();
        this.log.info(`Rogue ${character.name} is initializing`);
    }

    // Add rogue-specific methods here
    skillHandler() {
        this.log.info(`Rogue ${character.name} is handling skills`);
        // Implement skill logic here
    }
}