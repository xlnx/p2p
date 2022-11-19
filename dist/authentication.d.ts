import type { P2PDB } from "./db";
import type { Client } from "./types";
/** Generate secure credentials to pass to boardgame.io. */
export declare function generateCredentials(): string;
/**
 * Sign and encode a message string with the given private key.
 * @param message utf8 string to be signed.
 * @param privateKey base64-encoded private key to sign the message with.
 * @returns Signed message encoded as a base64 string.
 */
export declare function signMessage(message: string, privateKey: string): string;
/**
 * Authenticate a client by comparing its metadata with the credentials
 * stored in the database for the given match.
 */
export declare function authenticate(matchID: string, clientMetadata: Client["metadata"], db: P2PDB): boolean;
//# sourceMappingURL=authentication.d.ts.map