/**
 * 5 - Logger System
 * 
 * My implementation of a log system to monitor relevent information.
 * 
 */
load_code(1, () => { game_log("Failed to load code slot 1 from 5"); });

const debugLogLevels = {
    fatal: 0, // Unique errors that should always be explicitly tracked
    error: 1, // Unique errors that should usually be explicity tracked
    controlFlow0: 2, // Control flow debugging, highest level for function calls/mapping
    controlFlow1: 3, // Control flow debugging, more granual insight into control flow
    controlFlow2: 4, // Specific state or variable statuses
}

const infoLogLevels = {
    fatal: 0, // Something critical has gone wrong, needs debugging
    error: 1, // Something failed but state can recover
    warn: 2, // Something seems wrong, should investigate/verify
    stateChange: 3, // Decion flow logic
    info: 4, // General info that should be stored 
}

class Logger {
    constructor(characterName) {
        this.debugLog = {
            variableName: localStorageVariables.debugLog,
            log: [],
            length: 100,
            threshold: debugLogLevels.error // Levels higher than this value will not be added.
        }

        this.infoLog = {
            variableName: localStorageVariables.infoLog,
            log: [],
            length: 100,
            threshold: infoLogLevels.stateChange // Levels higher than this value will not be added.
        }

        this.criticalLog = {
            variableName: localStorageVariables.criticalLog,
            log: [],
            length: 100,
        }
    }

    /**
     * 
     * @param {debugLogLevels} level 
     * @param {{timestamp: String, msg:String}} msg
     */
    dLog(level, msg) {
        if (level === 0) {
            if (this.criticalLog.log.push(msg) > this.criticalLog.length) {
                this.criticalLog.log.shift()
            }
        }

        if (level <= this.debugLog.threshold) {
            if (this.debugLog.log.push(msg) > this.debugLog.length) {
                this.debugLog.log.shift()
            }
        }
    }

    /**
     * 
     * @param {infoLogLevels} level 
     * @param {{timestamp: String, msg:String}} msg
     */
    iLog(level, msg) {
        if (level === 0) {
            if (this.criticalLog.log.push(msg) > this.criticalLog.length) {
                this.criticalLog.log.shift()
            }
        }

        if (level <= this.infoLog.threshold) {
            if (this.infoLog.log.push(msg) > this.infoLog.length) {
                this.infoLog.log.shift()
            }
        }
    }

    backup() {
        set(this.criticalLog.variableName, JSON.stringify(this.criticalLog.log))
        set(this.debugLog.variableName, JSON.stringify(this.debugLog.log))
        set(this.infoLog.variableName, JSON.stringify(this.infoLog.log))
    }

    recover() {
        let critRaw = get(this.criticalLog.variableName)
        if (critRaw) this.criticalLog.log = JSON.parse(critRaw)
        let debugRaw = get(this.debugLog.variableName)
        if (debugRaw) this.debugLog.log = JSON.parse(debugRaw)
        let infoRaw = get(this.infoLog.variableName)
        if (infoRaw) this.infoLog.log = JSON.parse(infoRaw)
    }
}