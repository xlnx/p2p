import { LogEntry, Server, State, StorageAPI } from "boardgame.io";
import { Sync } from "boardgame.io/internal";
/**
 * In-browser storage implementation for use by P2P hosts.
 *
 * Currently a simple in-memory store, but should be improved to provide
 * persistence across sessions using IndexedDB or similar.
 */
export declare class P2PDB extends Sync {
    private initialState;
    private state;
    private log;
    private metadata;
    connect(): void;
    createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): void;
    setState(matchID: string, state: State, deltalog?: LogEntry[]): void;
    setMetadata(matchID: string, metadata: Server.MatchData): void;
    fetch<O extends StorageAPI.FetchOpts>(matchID: string): StorageAPI.FetchResult<O>;
    wipe(matchID: string): void;
    listMatches(): string[];
}
//# sourceMappingURL=db.d.ts.map