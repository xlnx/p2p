import { DataConnection } from "peerjs";
import type { PeerJSOption } from "peerjs";
import { Transport } from "boardgame.io/internal";
import type { ChatMessage, CredentialedActionShape, State } from "boardgame.io";
export { generateCredentials } from "./authentication";
type TransportOpts = ConstructorParameters<typeof Transport>[0];
type PeerError = Error & {
    type: "browser-incompatible" | "disconnected" | "invalid-id" | "invalid-key" | "network" | "peer-unavailable" | "ssl-unavailable" | "server-error" | "socket-error" | "socket-closed" | "unavailable-id" | "webrtc";
};
interface P2POpts {
    isHost?: boolean;
    peerOptions?: PeerJSOption;
    onError?: (error: PeerError) => void;
    onClose?: () => void;
    acceptClient?: (client: DataConnection) => boolean;
}
declare class P2PTransport extends Transport {
    private peer;
    private peerOptions;
    private onError;
    private onClose;
    private acceptClient;
    private isHost;
    private game;
    private emit?;
    private retryHandler;
    private privateKey?;
    constructor({ isHost, onError, onClose, acceptClient, peerOptions, ...opts }: TransportOpts & P2POpts);
    /** Synthesized peer ID for looking up this match’s host. */
    private get hostID();
    /** Keep credentials and encryption keys in sync. */
    private setCredentials;
    /** Client metadata for this client instance. */
    private get metadata();
    connect(): void;
    /** Establish a connection to a remote host from a peer client. */
    private connectToHost;
    /** Execute tasks once the connection to a remote or local host has been established. */
    private onConnect;
    disconnect(): void;
    requestSync(): void;
    sendAction(state: State, action: CredentialedActionShape.Any): void;
    sendChatMessage(matchID: string, chatMessage: ChatMessage): void;
    private reconnect;
    updateMatchID(id: string): void;
    updatePlayerID(id: string): void;
    updateCredentials(credentials?: string): void;
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
export declare const P2P: (p2pOpts?: P2POpts) => (transportOpts: TransportOpts) => P2PTransport;
//# sourceMappingURL=index.d.ts.map