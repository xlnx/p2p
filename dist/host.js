"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2PHost = void 0;
const internal_1 = require("boardgame.io/internal");
const master_1 = require("boardgame.io/master");
const db_1 = require("./db");
const authentication_1 = require("./authentication");
/**
 * Peer-to-peer host class, which runs a local `Master` instance
 * and sends authoritative state updates to all connected players.
 */
class P2PHost {
    constructor({ game, numPlayers = 2, matchID, }) {
        this.clients = new Map();
        this.matchID = matchID;
        if (!game.name || game.name === "default") {
            console.error('Using "default" as your game name.\n' +
                "Please set the `name` property of your game definition " +
                "to a unique string to help avoid peer ID conflicts.");
        }
        const match = (0, internal_1.createMatch)({
            game,
            numPlayers,
            unlisted: false,
            setupData: undefined,
        });
        if ("setupDataError" in match) {
            throw new Error("setupData Error: " + match.setupDataError);
        }
        this.db = new db_1.P2PDB();
        this.db.createMatch(this.matchID, match);
        const filterPlayerView = (0, internal_1.getFilterPlayerView)(game);
        this.master = new master_1.Master(game, this.db, {
            send: (_a) => {
                var { playerID } = _a, data = __rest(_a, ["playerID"]);
                const playerView = filterPlayerView(playerID, data);
                for (const [client] of this.clients) {
                    if (client.metadata.playerID === playerID)
                        client.send(playerView);
                }
            },
            sendAll: (data) => {
                for (const [client] of this.clients) {
                    const playerView = filterPlayerView(client.metadata.playerID, data);
                    client.send(playerView);
                }
            },
        });
    }
    /**
     * Add a client to the host’s registry.
     * The host calls the `send` method on registered clients to dispatch updates to them.
     */
    registerClient(client) {
        const isAuthenticated = this.authenticateClient(client);
        // If the client failed to authenticate, don’t register it.
        if (!isAuthenticated)
            return;
        const { playerID, credentials } = client.metadata;
        this.clients.set(client, client);
        this.master.onConnectionChange(this.matchID, playerID, credentials, true);
    }
    /**
     * Store a player’s credentials on initial connection and authenticate them subsequently.
     * @param client Client to authenticate.
     * @returns `true` if the client was successfully authenticated, `false` if it wasn’t.
     */
    authenticateClient(client) {
        return (0, authentication_1.authenticate)(this.matchID, client.metadata, this.db);
    }
    /** Remove a client from the host’s registry. */
    unregisterClient(client) {
        const { credentials, playerID } = client.metadata;
        this.clients.delete(client);
        this.master.onConnectionChange(this.matchID, playerID, credentials, false);
    }
    /** Submit an action to the host to be processed and emitted to registered clients. */
    processAction(data) {
        switch (data.type) {
            case "update":
                this.master.onUpdate(...data.args);
                break;
            case "chat":
                this.master.onChatMessage(...data.args);
                break;
            case "sync":
                this.master.onSync(...data.args);
                break;
        }
    }
}
exports.P2PHost = P2PHost;
