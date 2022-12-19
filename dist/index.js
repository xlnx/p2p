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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2P = exports.generateCredentials = void 0;
const peerjs_1 = __importDefault(require("peerjs"));
const tweetnacl_1 = require("tweetnacl");
const tweetnacl_util_1 = require("tweetnacl-util");
const internal_1 = require("boardgame.io/internal");
const host_1 = require("./host");
const authentication_1 = require("./authentication");
var authentication_2 = require("./authentication");
Object.defineProperty(exports, "generateCredentials", { enumerable: true, get: function () { return authentication_2.generateCredentials; } });
/**
 * Abstraction around `setTimeout`/`clearTimeout` that doubles the timeout
 * interval each time it is run until reaches a maximum interval length.
 */
class BackoffScheduler {
    constructor() {
        this.initialInterval = 500;
        this.maxInterval = 32000;
        this.interval = this.initialInterval;
    }
    cancelTask() {
        if (this.taskID) {
            clearTimeout(this.taskID);
            delete this.taskID;
        }
    }
    schedule(task) {
        this.cancelTask();
        this.taskID = setTimeout(() => {
            if (this.interval < this.maxInterval)
                this.interval *= 2;
            task();
        }, this.interval);
    }
    clear() {
        this.cancelTask();
        this.interval = this.initialInterval;
    }
}
class P2PTransport extends internal_1.Transport {
    constructor(_a) {
        var { isHost, 
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onError = () => { }, onClose = () => { }, acceptClient = () => true, peerOptions = {} } = _a, opts = __rest(_a, ["isHost", "onError", "onClose", "acceptClient", "peerOptions"]);
        super(opts);
        this.peer = null;
        this.isHost = Boolean(isHost);
        this.onError = onError;
        this.onClose = onClose;
        this.acceptClient = acceptClient;
        this.peerOptions = peerOptions;
        this.game = opts.game;
        this.retryHandler = new BackoffScheduler();
        this.setCredentials(opts.credentials);
    }
    /** Synthesized peer ID for looking up this match’s host. */
    get hostID() {
        if (!this.matchID)
            throw new Error("matchID must be provided");
        // Sanitize host ID for PeerJS: remove any non-alphanumeric characters, trim
        // leading/trailing hyphens/underscores and collapse consecutive hyphens/underscores.
        return `boardgameio-${this.gameName}-matchid-${this.matchID}`.replace(/([^A-Za-z0-9_-]|^[_-]+|[_-]+$|(?<=[_-])[_-]+)/g, "");
    }
    /** Keep credentials and encryption keys in sync. */
    setCredentials(credentials) {
        if (!credentials) {
            this.privateKey = this.credentials = undefined;
            return;
        }
        // TODO: implement a real sha256 not just sha512 and cut of the end!
        const seed = (0, tweetnacl_1.hash)((0, tweetnacl_util_1.decodeUTF8)(credentials)).slice(0, 32);
        const { publicKey, secretKey } = tweetnacl_1.sign.keyPair.fromSeed(seed);
        this.credentials = (0, tweetnacl_util_1.encodeBase64)(publicKey);
        this.privateKey = (0, tweetnacl_util_1.encodeBase64)(secretKey);
    }
    /** Client metadata for this client instance. */
    get metadata() {
        return {
            playerID: this.playerID,
            credentials: this.credentials,
            message: this.playerID && this.privateKey
                ? (0, authentication_1.signMessage)(this.playerID, this.privateKey)
                : undefined,
        };
    }
    connect() {
        this.peer = new peerjs_1.default(this.isHost ? this.hostID : undefined, this.peerOptions);
        if (this.isHost) {
            const host = new host_1.P2PHost({
                game: this.game,
                numPlayers: this.numPlayers,
                matchID: this.matchID,
            });
            // Process actions locally.
            this.emit = (action) => void host.processAction(action);
            // Register a local client for the host that applies updates directly to itself.
            host.registerClient({
                send: (data) => void this.notifyClient(data),
                metadata: this.metadata,
            });
            // When a peer connects to the host, register it and set up event handlers.
            this.peer.on("connection", (client) => {
                if (this.acceptClient(client)) {
                    host.registerClient(client);
                    client.on("data", (data) => void host.processAction(data));
                    client.on("close", () => void host.unregisterClient(client));
                    window &&
                        window.addEventListener("beforeunload", () => client.close());
                }
                else {
                    client.close();
                }
            });
            this.peer.on("error", this.onError);
            this.onConnect();
        }
        else {
            this.peer.on("open", () => void this.connectToHost());
            this.peer.on("error", (error) => {
                if (error.type === "network" || error.type === "peer-unavailable") {
                    this.retryHandler.schedule(() => void this.connectToHost());
                }
                else {
                    this.onError(error);
                }
            });
        }
    }
    /** Establish a connection to a remote host from a peer client. */
    connectToHost() {
        if (!this.peer)
            return;
        const host = this.peer.connect(this.hostID, { metadata: this.metadata });
        // Forward actions to the host.
        this.emit = (action) => void host.send(action);
        // Emit sync action when a connection to the host is established.
        host.on("open", () => void this.onConnect());
        // Apply updates received from the host.
        host.on("data", (data) => void this.notifyClient(data));
        host.on("close", this.onClose);
        window && window.addEventListener("beforeunload", () => host.close());
    }
    /** Execute tasks once the connection to a remote or local host has been established. */
    onConnect() {
        this.retryHandler.clear();
        this.setConnectionStatus(true);
        this.requestSync();
    }
    disconnect() {
        if (this.peer)
            this.peer.destroy();
        this.peer = null;
        this.retryHandler.clear();
        this.setConnectionStatus(false);
    }
    requestSync() {
        if (!this.emit)
            return;
        this.emit({
            type: "sync",
            args: [this.matchID, this.playerID, this.credentials, this.numPlayers],
        });
    }
    sendAction(state, action) {
        if (!this.emit)
            return;
        this.emit({
            type: "update",
            args: [action, state._stateID, this.matchID, this.playerID],
        });
    }
    sendChatMessage(matchID, chatMessage) {
        if (!this.emit)
            return;
        this.emit({ type: "chat", args: [matchID, chatMessage, this.credentials] });
    }
    reconnect() {
        this.disconnect();
        this.connect();
    }
    updateMatchID(id) {
        this.matchID = id;
        this.reconnect();
    }
    updatePlayerID(id) {
        this.playerID = id;
        this.reconnect();
    }
    updateCredentials(credentials) {
        this.setCredentials(credentials);
        this.reconnect();
    }
}
/**
 * Experimental peer-to-peer multiplayer transport for boardgame.io.
 *
 * @param p2pOpts Transport configuration options.
 * @param p2pOpts.isHost Boolean flag to indicate if this client is responsible for the authoritative game state.
 * @param p2pOpts.onError Error callback.
 * @param p2pOpts.peerOptions Options to pass when instantiating a new PeerJS `Peer`.
 * @returns A transport factory for use by a boardgame.io client.
 * @example
 * import { Client } from 'boardgame.io/client';
 * import { P2P } from '@boardgame.io/p2p';
 * import { MyGame } from './game';
 *
 * const matchID = 'random-id-string';
 *
 * // Host clients maintain the authoritative game state and manage
 * // communication between all other peers.
 * const hostClient = Client({
 *   game: MyGame,
 *   matchID,
 *   playerID: '0',
 *   credentials: 'string-to-protect-playerID-zero',
 *   multiplayer: P2P({ isHost: true }),
 * });
 *
 * // Peer clients look up a host using the `matchID` and communicate
 * // with the host much like they would with a server.
 * const peerClient = Client({
 *   game: MyGame,
 *   matchID,
 *   playerID: '1',
 *   credentials: 'string-to-protect-playerID-one',
 *   multiplayer: P2P(),
 * });
 */
const P2P = (p2pOpts = {}) => (transportOpts) => new P2PTransport(Object.assign(Object.assign({}, transportOpts), p2pOpts));
exports.P2P = P2P;
