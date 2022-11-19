import type { Game } from "boardgame.io";
import type { Client, ClientAction } from "./types";
/**
 * Peer-to-peer host class, which runs a local `Master` instance
 * and sends authoritative state updates to all connected players.
 */
export declare class P2PHost {
    private clients;
    private matchID;
    private master;
    private db;
    constructor({ game, numPlayers, matchID, }: {
        game: Game;
        numPlayers?: number;
        matchID: string;
    });
    /**
     * Add a client to the host’s registry.
     * The host calls the `send` method on registered clients to dispatch updates to them.
     */
    registerClient(client: Client): void;
    /**
     * Store a player’s credentials on initial connection and authenticate them subsequently.
     * @param client Client to authenticate.
     * @returns `true` if the client was successfully authenticated, `false` if it wasn’t.
     */
    private authenticateClient;
    /** Remove a client from the host’s registry. */
    unregisterClient(client: Client): void;
    /** Submit an action to the host to be processed and emitted to registered clients. */
    processAction(data: ClientAction): void;
}
//# sourceMappingURL=host.d.ts.map