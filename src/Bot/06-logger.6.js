/**
 * 6 - Logger System
 * 
 * Provides a centralized logging facility with configurable log levels,
 * formatted output, and easy-to-use methods for each level.
 * 
 */

const logLevels = {
    fatal: 0,       // Something critical has gone wrong, needs immediate attention
    error: 1,       // An operation failed but the application can recover
    warn: 2,        // Something unexpected happened, should investigate
    stateChange: 3, // State machine transitions and decision logic
    info: 4,        // General runtime information
};

class Logger {
    constructor(level = logLevels.info, logLength = 100) {
        this.log = [];
        this.logLevel = level;
        this.logLength = logLength;
    }

    loggerConfirmClass() {
        return true;
    }

    showLog() {
        show_json(this.log);
    }

    /**
     * 
     * @param {String} msg
     * @param {logLevels} level 
     */
    log(msg, level = logLevels.info) {
        if (level <= this.logLevel) {
            if (this.log.push(this.createLogMsg(msg, level)) > this.logLength) {
                this.log.shift()
            }
        }
    }

    /**
     * 
     * @param {String} msg
     * @param {logLevels} level
     * @returns {Object}
     */
    createLogMsg(msg, level = logLevels.info) {
        return {
            level: level,
            time: new Date().toISOString(),
            msg: msg,
        }
    }

    /**
     * 
     * @param {Object} logMsg
     * @param {logLevels} logMsg.level
     * @param {String} logMsg.time
     * @param {String} logMsg.msg
     * @returns {String} 
     */
    formatLogMsg(logMsg) {
        return `[${logMsg.level}] - ${logMsg.time}: ${logMsg.msg}`;
    }

    fatal(msg) {
        this.log(msg, logLevels.fatal);
    }
    error(msg) {
        this.log(msg, logLevels.error);
    }
    warn(msg) {
        this.log(msg, logLevels.warn);
    }
    stateChange(msg) {
        this.log(msg, logLevels.stateChange);
    }
    info(msg) {
        this.log(msg, logLevels.info);
    }
}