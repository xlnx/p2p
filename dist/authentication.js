"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.signMessage = exports.generateCredentials = void 0;
const tweetnacl_1 = require("tweetnacl");
const tweetnacl_util_1 = require("tweetnacl-util");
/** Generate secure credentials to pass to boardgame.io. */
function generateCredentials() {
    return (0, tweetnacl_util_1.encodeBase64)((0, tweetnacl_1.randomBytes)(64));
}
exports.generateCredentials = generateCredentials;
/**
 * Verify that a signed message was signed by the given public key.
 * @param message Message signed by the client’s private key encoded as a base64 string.
 * @param publicKey Client’s public key encoded as a base64 string.
 * @param playerID playerID that the message is expected to decrypt to.
 * @returns `true` if the message is valid, `false` otherwise.
 */
function verifyMessage(message, publicKey, playerID) {
    try {
        const verifedMessage = tweetnacl_1.sign.open((0, tweetnacl_util_1.decodeBase64)(message), (0, tweetnacl_util_1.decodeBase64)(publicKey));
        return verifedMessage !== null && (0, tweetnacl_util_1.encodeUTF8)(verifedMessage) === playerID;
    }
    catch (error) {
        return false;
    }
}
/**
 * Sign and encode a message string with the given private key.
 * @param message utf8 string to be signed.
 * @param privateKey base64-encoded private key to sign the message with.
 * @returns Signed message encoded as a base64 string.
 */
function signMessage(message, privateKey) {
    return (0, tweetnacl_util_1.encodeBase64)((0, tweetnacl_1.sign)((0, tweetnacl_util_1.decodeUTF8)(message), (0, tweetnacl_util_1.decodeBase64)(privateKey)));
}
exports.signMessage = signMessage;
/**
 * Authenticate a client by comparing its metadata with the credentials
 * stored in the database for the given match.
 */
function authenticate(matchID, clientMetadata, db) {
    const { playerID, credentials, message } = clientMetadata;
    const { metadata } = db.fetch(matchID);
    // Spectators provide null/undefined playerIDs and don’t need authenticating.
    if (playerID === null ||
        playerID === undefined ||
        !(+playerID in metadata.players)) {
        return true;
    }
    const existingCredentials = metadata.players[+playerID].credentials;
    const isMessageValid = credentials
        ? !!message && verifyMessage(message, credentials, playerID)
        : false;
    // If no credentials exist yet for this player, store those
    // provided by the connecting client and authenticate.
    if (!existingCredentials && isMessageValid) {
        db.setMetadata(matchID, Object.assign(Object.assign({}, metadata), { players: Object.assign(Object.assign({}, metadata.players), { [+playerID]: Object.assign(Object.assign({}, metadata.players[+playerID]), { credentials }) }) }));
        return true;
    }
    // If credentials are neither provided nor stored, authenticate.
    if (!existingCredentials && !credentials)
        return true;
    // If credentials match, authenticate.
    if (existingCredentials &&
        existingCredentials === credentials &&
        isMessageValid) {
        return true;
    }
    return false;
}
exports.authenticate = authenticate;
