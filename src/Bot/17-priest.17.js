/**
 * 17 - Priest Class
 * 
 * Extended Hunter for Priest Functionality
 * 
 */

class Priest extends Hunter {
    constructor() {
        super();
        this.log.info(`Priest ${character.name} created`);
    }

    init() {
        super.init();
        this.log.info(`Priest ${character.name} is initializing`);
    }

    // Add priest-specific methods here
    skillHandler() {
        this.log.info(`Priest ${character.name} is handling skills`);
        // Implement skill logic here
    }
}