// hypertokens/src/main.js - Entry point HyperTracker

import { App } from "./app.js";
import { msb_opts, peer_opts } from "./setup.js";

console.log("🚀 HyperTracker starting...");
console.log("📡 MSB Bootstrap:", msb_opts.bootstrap.substring(0, 16) + "...");
console.log("🌐 Peer Bootstrap:", peer_opts.bootstrap.substring(0, 16) + "...");

// Style Hypermall : Simple et direct
export const app = new App(msb_opts, peer_opts);

// Démarrer l'app avec gestion des erreurs
try {
  await app.start();
  console.log("🎯 HyperTracker ready!");
  
  // Test : Récupérer les tokens
  const tokens = await app.getAllTokens();
  console.log(`💰 ${tokens.length} tokens available on HyperTokens network`);
  
} catch (error) {
  console.error("❌ HyperTracker failed to start:", error);
  console.log("💡 This might be the DLI bootstrap timing issue");
  console.log("🔄 Try restarting the app or wait a moment");
}