"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2PDB = void 0;
const internal_1 = require("boardgame.io/internal");
/**
 * In-browser storage implementation for use by P2P hosts.
 *
 * Currently a simple in-memory store, but should be improved to provide
 * persistence across sessions using IndexedDB or similar.
 */
class P2PDB extends internal_1.Sync {
    constructor() {
        super(...arguments);
        this.initialState = new Map();
        this.state = new Map();
        this.log = new Map();
        this.metadata = new Map();
    }
    connect() {
        // Required by parent class interface.
    }
    createMatch(matchID, opts) {
        this.initialState.set(matchID, opts.initialState);
        this.state.set(matchID, opts.initialState);
        this.log.set(matchID, []);
        this.metadata.set(matchID, opts.metadata);
    }
    setState(matchID, state, deltalog) {
        this.state.set(matchID, state);
        if (deltalog) {
            this.log.set(matchID, [...(this.log.get(matchID) || []), ...deltalog]);
        }
    }
    setMetadata(matchID, metadata) {
        this.metadata.set(matchID, metadata);
    }
    fetch(matchID) {
        const res = {
            initialState: this.initialState.get(matchID),
            state: this.state.get(matchID),
            log: this.log.get(matchID),
            metadata: this.metadata.get(matchID),
        };
        return res;
    }
    wipe(matchID) {
        this.initialState.delete(matchID);
        this.state.delete(matchID);
        this.log.delete(matchID);
        this.metadata.delete(matchID);
    }
    listMatches() {
        return [...this.metadata.keys()];
    }
}
exports.P2PDB = P2PDB;
