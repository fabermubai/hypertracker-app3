// hypertokens/src/setup.js - Configuration HyperTracker CORRIGÉE

// ✅ CORRECTION : Importer depuis les vrais fichiers contract/
import HypertokensProtocol from "../contract/protocol.js";
import HypertokensContract from "../contract/contract.js";

// Fonction pour obtenir le storage path
function getStorePath() {
  if (typeof Pear !== 'undefined' && Pear.config?.storage) {
    return Pear.config.storage;
  }
  return './data';
}

console.log("Storage path:", getStorePath());

///// MSB SETUP (MainSettlementBus)
export const msb_opts = {};
msb_opts.bootstrap = "54c2623aa400b769b2837873653014587278fb83fd72e255428f78a4ff7bac87";
msb_opts.channel = "00000000000000000000000trac20msb";
msb_opts.store_name = getStorePath() + "/ht_msb";

///// HYPERTOKENS SETUP  
export const peer_opts = {};
peer_opts.protocol = HypertokensProtocol;  // ✅ CORRIGÉ
peer_opts.contract = HypertokensContract;  // ✅ CORRIGÉ
peer_opts.bootstrap = "c8d69852fe7828709349a68c61c3d88ab9078ec4331e07ebaaf1e8b55e67a287";
peer_opts.channel = "00000000000000000000000002trac20";
peer_opts.store_name = getStorePath() + "/hypertracker";
peer_opts.api_tx_exposed = true;
peer_opts.api_msg_exposed = true;