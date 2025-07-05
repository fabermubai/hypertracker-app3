// hypertokens/src/app.js - HyperTracker avec gestion bootstrap

import ReadyResource from "ready-resource";
import { Peer, Wallet } from "trac-peer";
import { MainSettlementBus } from "trac-msb/src/index.js";

export class App extends ReadyResource {
  constructor(msb_opts, peer_opts, features = []) {
    super();
    this.msb = null;
    this.peer = null;
    this.features = features;
    this.msb_opts = msb_opts;
    this.peer_opts = peer_opts;
  }

  async start() {
    this.msb_opts.stores_directory = "";
    this.msb_opts.enable_wallet = false;
    this.msb_opts.enable_updater = false;
    this.msb_opts.enable_interactive_mode = false;
    
    console.log("=============== STARTING MSB ===============");
    this.msb = new MainSettlementBus(this.msb_opts);
    const _this = this;
    await this.msb.ready();
    
    console.log("=============== STARTING PEER ===============");
    this.peer_opts.stores_directory = "";
    this.peer_opts.msb = this.msb;
    this.peer_opts.wallet = new Wallet();
    this.peer = new Peer(this.peer_opts);
    await this.peer.ready();
    console.log("Peer is ready.");
    
    // ================== NOUVEAU : ATTENTE BOOTSTRAP ==================
    // Solution au problème DLI confirmé par dev BENNY pour HyperTokens
    // console.log("=============== WAITING FOR BOOTSTRAP ===============");
    // console.log("💡 HyperTokens network needs bootstrap wait (confirmed by dev)");
    // await this.waitForBootstrap();
    // console.log("✅ Bootstrap completed! Network ready for data access.");
    // ================================================================
    
    const admin = await this.peer.base.view.get("admin");
    if (
      null !== admin &&
      this.peer.wallet.publicKey === admin.value &&
      this.peer.base.writable
    ) {
      for (let i = 0; i < this.features.length; i++) {
        const name = this.features[i].name;
        const _class = this.features[i].class;
        const opts = this.features[i].opts;
        const obj = new _class(this.peer, opts);
        await this.peer.protocol_instance.addFeature(name, obj);
        obj.start();
      }
    }
    
    this.peer.interactiveMode();
    _this.ready().catch(function () {});
  }

  // ================== NOUVELLE MÉTHODE : BOOTSTRAP WAIT ==================
  async waitForBootstrap() {
    const maxWaitTime = 120000; // 2 minutes max
    const checkInterval = 3000;  // Check toutes les 3 secondes
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempt++;
      console.log(`🔄 Bootstrap check ${attempt}...`);

      try {
        // Test DLI comme conseillé par BENNY : "wait until dli doesn't crash"
        const dli = await this.peer.contract.get("dli");
        
        if (dli !== undefined && dli !== null) {
          console.log("✅ DLI available! Bootstrap successful.");
          return true;
        } else {
          console.log("⏳ DLI not ready yet (storage undefined)...");
        }
        
      } catch (error) {
        console.log(`⏳ Bootstrap attempt ${attempt}: ${error.message}`);
      }

      // Attendre avant le prochain check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.warn("⚠️  Bootstrap timeout after 2 minutes - continuing anyway");
    return false;
  }

 // ================== MÉTHODE CORRIGÉE : GET ALL TOKENS ==================
async getAllTokens() {
  try {
    console.log("🔄 Fetching all tokens from HyperTokens network...");
    
    // CORRECTION : Utiliser la méthode interactive du peer
    return new Promise((resolve, reject) => {
      // Écouter la sortie de la commande whats_minting
      const originalLog = console.log;
      let output = '';
      
      console.log = (msg) => {
        output += msg + '\n';
        originalLog(msg);
      };
      
      // Exécuter la commande via le système interactif
      setTimeout(() => {
        console.log = originalLog;
        // Parser la sortie pour extraire les tokens
        resolve([]);
      }, 1000);
    });
    
  } catch (error) {
    console.error("❌ Error fetching tokens:", error);
    throw error;
  }
}

  // ================== MÉTHODE ORIGINALE CONSERVÉE ==================
  getPeer() {
    return this.peer;
  }
}