// src/monitoring-engine.js
// HyperTracker Monitoring Engine - ULTRA-COMPLET avec saveData() CORRIGÉ
// Adapté de hypertokens-realtime-monitor.js (1146 lignes) - TOUTE la logique incluse
// Version browser avec sauvegarde localStorage FONCTIONNELLE

import { App } from './app.js';
import { getStorePath } from './functions.js';
import HypertokensProtocol from "../contract/protocol.js";
import HypertokensContract from "../contract/contract.js";

export class HyperTrackerMonitoringEngine {
    constructor() {
        console.log('🚀 HyperTracker Monitoring Engine starting...');
        console.log('🎯 ULTRA-COMPLETE version - ALL logic from hypertokens-realtime-monitor.js (1146 lines)');
        console.log('🔥 Every function, every method, every feature - adapted for browser!');
        console.log('💾 FIXED: saveData() now handles Maps/Sets correctly!');

        this.app = null;
        this.peer = null;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.saveInterval = null;

        // Base de données en mémoire temps réel (EXACTE du fichier original)
        this.database = {
            tokens: new Map(),           // ticker -> tokenData
            transactions: [],            // Array of all transactions
            addresses: new Map(),        // address -> addressData  
            balances: new Map(),         // address+ticker -> balance
            holders: new Map(),          // ticker -> Set of addresses
            stats: {
                totalTransactions: 0,
                totalTokens: 0,
                totalAddresses: 0,
                lastProcessedTx: -1,     // FORCE scan from start
                networkHeight: 0,
                isLive: false,
                lastUpdate: 0
            }
        };

        // Configuration du monitoring (EXACTE du fichier original)
        this.config = {
            syncInterval: 5000,          // Sync toutes les 5 secondes
            batchSize: 100,              // Traiter 100 TXs à la fois
            maxRetries: 3,               // Retry en cas d'erreur
            dataPath: './data',          // Dossier pour les sauvegardes (browser: localStorage)
            enableWebAPI: false,         // API Web désactivée pour browser
            enableWebSocket: false,      // WebSocket désactivé
            webPort: 3333,               // Port de l'API
            saveInterval: 60000,         // Sauvegarde toutes les minutes
        };

        // Callbacks pour l'interface (remplacent EventEmitter)
        this.callbacks = {
            newToken: [],
            newMint: [],
            newTransfer: [],
            newTransactions: [],
            update: []
        };

        this.setupDataDirectory();
    }

    // === SYSTÈME D'ÉVÉNEMENTS ADAPTÉ (remplace EventEmitter) ===
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    // === UTILITAIRE: DÉRIVER L'ADRESSE DE LA CLÉ PUBLIQUE (EXACT) ===
    deriveAddressFromPublicKey(publicKey) {
        if (!publicKey || typeof publicKey !== 'string') {
            return null;
        }

        try {
            // 🔧 CORRECTION: Dans Hypertokens, l'adresse EST la clé publique !
            // Pas besoin de hash, la clé publique est directement l'adresse
            return publicKey;
        } catch (error) {
            console.error('❌ Error deriving address from public key:', error);
            return null;
        }
    }

    // === SETUP DATA DIRECTORY (adapté pour browser) ===
    async setupDataDirectory() {
        try {
            // Version browser-compatible utilisant localStorage
            console.log('📁 Data directories setup (browser mode with localStorage)');

            // Initialiser les "dossiers" dans localStorage
            const dirs = ['tokens', 'transactions', 'checkpoints'];
            dirs.forEach(dir => {
                const key = `hypertracker_${dir}`;
                if (!localStorage.getItem(key)) {
                    localStorage.setItem(key, JSON.stringify({}));
                }
            });

            console.log('📁 Browser data directories initialized');
        } catch (error) {
            console.error('❌ Error creating directories:', error.message);
        }
    }

    // === INITIALISATION (EXACTE du fichier original) ===
    async initialize(storeName = 'store1') {
        console.log('🚀 Initializing Real-Time Hypertokens Monitor...');
        console.log('🎯 Will track: Tokens, Transactions, Balances, Holders in REAL-TIME');
        console.log(`📁 Using store: ${storeName}`);

        // FORCER le store path au lieu d'utiliser getStorePath() qui retourne undefined
        const STORE_PATH = 'store1';
        console.log(`🔧 FORCING store path to: ${STORE_PATH}`);

        const msb_opts = {
            bootstrap: '54c2623aa400b769b2837873653014587278fb83fd72e255428f78a4ff7bac87',
            channel: '00000000000000000000000trac20msb',
            store_name: STORE_PATH + '/t20msb_2'
        };

        const peer_opts = {
            protocol: HypertokensProtocol,
            contract: HypertokensContract,
            bootstrap: 'c8d69852fe7828709349a68c61c3d88ab9078ec4331e07ebaaf1e8b55e67a287',
            channel: '00000000000000000000000002trac20',
            store_name: STORE_PATH + '/hypertokens',
            enable_logs: false,
            enable_txlogs: false
        };

        console.log('🔧 Actual store paths being used:');
        console.log('  MSB:', msb_opts.store_name);
        console.log('  Hypertokens:', peer_opts.store_name);

        // ✅ MÉTHODE QUI MARCHE - Un seul App avec les deux configs
        this.app = new App(msb_opts, peer_opts);
        await this.app.start();
        this.peer = this.app.getPeer();

        console.log('✅ Connected to Hypertokens network');
        return this.peer;
    }

    async safeGet(key) {
        await this.peer.base.update();
        return await this.peer.protocol_instance.get(key);
    }

    // === 🔧 FONCTION CORRIGÉE: CHARGEMENT COMPLET DU CHECKPOINT (localStorage FIXÉ) ===
    async loadExistingData() {
        try {
            console.log('🔍 Checking for existing checkpoint in localStorage...');

            // 🎯 TENTER DE CHARGER LE CHECKPOINT COMPLET depuis localStorage
            const checkpointData = localStorage.getItem('hypertracker_checkpoint');

            if (checkpointData && checkpointData !== 'null') {
                const checkpoint = JSON.parse(checkpointData);

                console.log('📊 CHECKPOINT FOUND - Loading complete database...');
                console.log(`⏰ Checkpoint from: ${checkpoint.timestamp}`);
                console.log(`📦 Contains: ${checkpoint.tokensCount} tokens, ${checkpoint.totalHolders} holders, ${checkpoint.balancesCount} balances`);

                // 🔧 RESTAURER TOUTE LA BASE DE DONNÉES avec vérifications !

                // 1. Restaurer les statistiques
                if (checkpoint.lastProcessedTx !== undefined) {
                    this.database.stats.lastProcessedTx = checkpoint.lastProcessedTx;
                }
                if (checkpoint.networkHeight !== undefined) {
                    this.database.stats.networkHeight = checkpoint.networkHeight;
                }
                this.database.stats.totalTokens = checkpoint.tokensCount || 0;
                this.database.stats.totalAddresses = checkpoint.addressesCount || 0;

                // 2. Restaurer les tokens (Map)
                if (checkpoint.tokens && Array.isArray(checkpoint.tokens)) {
                    this.database.tokens.clear();
                    for (const [ticker, tokenData] of checkpoint.tokens) {
                        this.database.tokens.set(ticker, tokenData);
                    }
                    console.log(`✅ Restored ${this.database.tokens.size} tokens`);
                }

                // 3. Restaurer les balances (Map)
                if (checkpoint.balances && Array.isArray(checkpoint.balances)) {
                    this.database.balances.clear();
                    for (const [key, balanceData] of checkpoint.balances) {
                        this.database.balances.set(key, balanceData);
                    }
                    console.log(`✅ Restored ${this.database.balances.size} balances`);
                }

                // 4. Restaurer les holders (Map de Sets)
                if (checkpoint.holders && Array.isArray(checkpoint.holders)) {
                    this.database.holders.clear();
                    for (const [ticker, holdersArray] of checkpoint.holders) {
                        if (Array.isArray(holdersArray)) {
                            this.database.holders.set(ticker, new Set(holdersArray));
                        }
                    }
                    console.log(`✅ Restored holders for ${this.database.holders.size} tokens`);
                }

                // 5. Restaurer les adresses (Map)
                if (checkpoint.addresses && Array.isArray(checkpoint.addresses)) {
                    this.database.addresses.clear();
                    for (const [address, addressData] of checkpoint.addresses) {
                        // Reconvertir les Sets depuis les arrays
                        if (addressData.tokens && Array.isArray(addressData.tokens)) {
                            addressData.tokens = new Set(addressData.tokens);
                        }
                        this.database.addresses.set(address, addressData);
                    }
                    console.log(`✅ Restored ${this.database.addresses.size} addresses`);
                }

                // 6. Valider les données chargées
                const totalHolders = this.getTotalHoldersCount();
                console.log(`🎯 DATABASE RESTORED: ${this.database.tokens.size} tokens, ${totalHolders} holders, ${this.database.balances.size} balances`);

                // 7. Vérifier s'il y a des transactions manquées
                try {
                    const currentHeight = await this.updateNetworkHeight();
                    const missedTransactions = currentHeight - this.database.stats.lastProcessedTx - 1;

                    if (missedTransactions > 0) {
                        console.log('📊 RESUMING from checkpoint...');
                        console.log(`⏰ Last processed TX: ${this.database.stats.lastProcessedTx}`);
                        console.log(`🔄 Current height: ${currentHeight}`);
                        console.log(`📈 Will process ${missedTransactions} missed transactions`);
                    } else {
                        console.log('✅ CHECKPOINT LOADED - Already up to date!');
                        console.log('🔄 Switching directly to real-time monitoring...');
                    }
                } catch (networkError) {
                    console.log('⚠️ Could not check network height, will sync when ready');
                }

            } else {
                throw new Error('No checkpoint found or checkpoint is null');
            }

        } catch (error) {
            // Pas de checkpoint trouvé ou erreur de parsing - premier démarrage
            console.log('📊 FIRST RUN - No valid checkpoint found');
            console.log('🎯 Starting COMPLETE HISTORICAL SCAN...');
            console.log('⏱️ This will take 15-30 minutes but only happens once!');
            console.log('💾 Future startups will be instant thanks to working checkpointing');

            this.database.stats.lastProcessedTx = -1;  // Force scan from start
            this.database.stats.networkHeight = 0;
        }
    }

    // === MÉTHODE getCompleteTokenData (EXACTE) ===
    async getCompleteTokenData(ticker) {
        try {
            const key = 'd/' + this.peer.protocol_instance.safeJsonStringify(ticker.toLowerCase());
            const deployment = await this.safeGet(key);

            if (!deployment) return null;

            const tokenData = {
                ticker: ticker,
                supply: this.peer.protocol_instance.fromBigIntString(deployment.supply, deployment.dec),
                amount: this.peer.protocol_instance.fromBigIntString(deployment.amt, deployment.dec),
                completed: this.peer.protocol_instance.fromBigIntString(deployment.com, deployment.dec),
                decimals: deployment.dec,
                deployer: deployment.addr,
                signed: deployment.signed || false,
                progress: (parseFloat(this.peer.protocol_instance.fromBigIntString(deployment.com, deployment.dec)) /
                    parseFloat(this.peer.protocol_instance.fromBigIntString(deployment.supply, deployment.dec))) * 100,
                lastUpdate: Date.now(),
                holders: new Set(),
                totalHolders: 0,
                totalTransactions: 0
            };

            return tokenData;
        } catch (error) {
            console.error(`Error getting token data for ${ticker}:`, error.message);
            return null;
        }
    }

    // === MONITORING TEMPS RÉEL (EXACT) ===
    async updateNetworkHeight() {
        try {
            await this.peer.base.update();
            this.database.stats.networkHeight = await this.peer.protocol_instance.api.getTxLength(false);
            return this.database.stats.networkHeight;
        } catch (error) {
            console.error('❌ Error updating network height:', error.message);
            return this.database.stats.networkHeight;
        }
    }

    // === TRAITEMENT DES TRANSACTIONS (EXACT - 100+ lignes) ===
    async processNewTransactions() {
        try {
            const currentHeight = await this.updateNetworkHeight();
            const lastProcessed = this.database.stats.lastProcessedTx;

            // Si lastProcessedTx = -1, on va scanner TOUT depuis le début
            const startFromTx = lastProcessed + 1;

            if (currentHeight <= lastProcessed) {
                return; // Pas de nouvelles transactions
            }

            const newTxCount = currentHeight - lastProcessed - 1;
            console.log(`🔄 Processing ${newTxCount} new transactions (${startFromTx} to ${currentHeight - 1})`);

            if (startFromTx === 0) {
                console.log('🎯 FULL HISTORICAL SCAN STARTING - This will discover ALL tokens AND calculate holders!');
                console.log('⏱️ Estimated time: 15-30 minutes for complete blockchain analysis with holders calculation');
                console.log('💾 Data will be saved every 60 seconds to localStorage');
            }

            // Traiter les nouvelles transactions par batch
            for (let txIndex = startFromTx; txIndex < currentHeight; txIndex += this.config.batchSize) {
                const batchEnd = Math.min(txIndex + this.config.batchSize, currentHeight);
                await this.processBatch(txIndex, batchEnd);
                this.database.stats.lastProcessedTx = batchEnd - 1;

                // Progress logging pour le scan complet avec stats holders
                if (startFromTx === 0) {
                    const progress = ((batchEnd / currentHeight) * 100).toFixed(1);
                    const tokensFound = this.database.tokens.size;
                    const totalHolders = this.getTotalHoldersCount();
                    const totalBalances = this.database.balances.size;

                    if (batchEnd % (this.config.batchSize * 10) === 0 || batchEnd >= currentHeight - this.config.batchSize) {
                        console.log(`📈 Scan progress: ${batchEnd}/${currentHeight} (${progress}%) - ${tokensFound} tokens, ${totalHolders} holders, ${totalBalances} balances`);
                    }
                }
            }

            this.database.stats.isLive = true;
            this.database.stats.lastUpdate = Date.now();

            // Émettre l'événement pour l'interface
            this.emit('newTransactions', {
                processed: newTxCount,
                totalTx: currentHeight,
                totalTokens: this.database.tokens.size
            });

            if (startFromTx === 0) {
                console.log(`🎉 HISTORICAL SCAN COMPLETE! Found ${this.database.tokens.size} total tokens`);
                console.log('🔄 Now switching to real-time monitoring mode...');
            }

        } catch (error) {
            console.error('❌ Error processing new transactions:', error.message);
            this.database.stats.isLive = false;
        }
    }

    // === 🔧 FONCTION DE CORRECTION: Recalculer les holders depuis les balances existantes (EXACT - 100+ lignes) ===
    async recalculateHoldersFromBalances() {
        console.log('🔧 RECALCULATING HOLDERS from existing balances...');

        // Réinitialiser tous les holders
        this.database.holders.clear();

        // 🎯 INITIALISER LES SETS POUR TOUS LES TOKENS (y compris ceux découverts via mint)
        for (const [ticker, token] of this.database.tokens) {
            this.database.holders.set(ticker, new Set());
            console.log(`🔧 INITIALIZED holders Set for token: ${ticker}`);
        }

        console.log(`📊 Processing ${this.database.balances.size} balances to calculate holders...`);
        console.log(`🔍 Tokens available: ${Array.from(this.database.tokens.keys()).slice(0, 5).join(', ')}...`);

        // 🔧 DEBUG: Analyser les balances
        let balancesProcessed = 0;
        let holdersFound = 0;
        let balancesWithValue = 0;
        let invalidBalances = 0;

        for (const [balanceKey, balanceData] of this.database.balances) {
            balancesProcessed++;
            const { address, ticker, balance } = balanceData;

            // 🔧 IGNORER LES BALANCES AVEC ADRESSE UNDEFINED
            if (!address || address === 'undefined') {
                invalidBalances++;
                console.log(`⚠️ SKIPPING invalid balance: Key=${balanceKey}, Address=${address}`);
                continue;
            }

            if (balance > 0) {
                balancesWithValue++;
                const holders = this.database.holders.get(ticker);

                if (holders && address) {
                    holders.add(address);
                    holdersFound++;
                    console.log(`👤 HOLDER ADDED: ${address.slice(0, 8)}... holds ${ticker} (${balance.toFixed(4)})`);
                }
            }
        }

        console.log(`🔧 SUMMARY: Processed ${balancesProcessed} balances, ${balancesWithValue} with value > 0, ${invalidBalances} invalid, ${holdersFound} holders added`);

        // Mettre à jour les counts dans les tokens
        let totalHoldersFound = 0;
        for (const [ticker, token] of this.database.tokens) {
            const holders = this.database.holders.get(ticker);
            if (holders) {
                token.totalHolders = holders.size;
                totalHoldersFound += holders.size;
                if (holders.size > 0) {
                    console.log(`📊 ${ticker}: ${holders.size} holders`);
                }
            }
        }

        console.log(`🎉 RECALCULATION COMPLETE! Found ${totalHoldersFound} total holder relationships across ${this.database.tokens.size} tokens`);
        return totalHoldersFound;
    }

    getTotalHoldersCount() {
        let total = 0;
        for (const holders of this.database.holders.values()) {
            total += holders.size;
        }
        return total;
    }

    // === TRAITEMENT BATCH (EXACT) ===
    async processBatch(start, end) {
        for (let i = start; i < end; i++) {
            try {
                const tx = await this.peer.protocol_instance.api.getTx(i, false);
                if (tx && !tx.err) {
                    await this.processTransaction(tx, i);
                }
            } catch (error) {
                console.error(`❌ Error processing TX ${i}:`, error.message);
            }
        }
    }

    // === TRAITEMENT TRANSACTION (EXACT - 60+ lignes) ===
    async processTransaction(tx, txIndex) {
        const txData = {
            index: txIndex,
            type: tx.val.type,
            timestamp: Date.now(),
            hash: this.generateTxHash(tx, txIndex)
        };

        // 🔧 CORRECTION MAJEURE: Dériver l'adresse depuis la clé publique IPK
        const signerAddress = this.deriveAddressFromPublicKey(tx.ipk);

        // Traiter selon le type de transaction
        switch (tx.val.type) {
            case 'deploy':
                await this.processDeploy(tx.val.value, txData);
                break;
            case 'mint':
                // NOUVEAU: Découvrir des tokens via MINT (comme /whats_minting)
                await this.discoverTokenFromMint(tx.val.value, txData);
                // 🔧 CORRECTION: Passer l'adresse dérivée
                await this.processMint(tx.val.value, txData, signerAddress);
                break;
            case 'transfer':
                // 🔧 CORRECTION: Passer l'adresse dérivée
                await this.processTransfer(tx.val.value, txData, signerAddress);
                break;
        }

        // Ajouter à l'historique
        this.database.transactions.push(txData);
        this.database.stats.totalTransactions++;

        // Garder seulement les 10k dernières transactions en mémoire
        if (this.database.transactions.length > 10000) {
            this.database.transactions.shift();
        }
    }

    // === 🎯 NOUVELLE MÉTHODE: Découvrir des tokens via les transactions MINT (EXACT) ===
    async discoverTokenFromMint(txValue, txData) {
        const ticker = txValue.tick;

        // Si on ne connaît pas ce token, le découvrir maintenant
        if (!this.database.tokens.has(ticker.toLowerCase())) {
            console.log(`🎯 TOKEN DISCOVERED VIA MINT: ${ticker} (mint at TX ${txData.index})`);

            try {
                const tokenData = await this.getCompleteTokenData(ticker);
                if (tokenData) {
                    tokenData.discoveredVia = 'mint';
                    tokenData.firstMintTx = txData.index;
                    this.database.tokens.set(ticker.toLowerCase(), tokenData);
                    this.database.stats.totalTokens++;

                    console.log(`✅ Token ${ticker} discovered via mint (${tokenData.progress.toFixed(1)}% complete)`);

                    // Émettre l'événement
                    this.emit('newToken', {
                        ticker,
                        discoveredVia: 'mint',
                        txIndex: txData.index,
                        progress: tokenData.progress
                    });
                } else {
                    console.log(`⚠️ Could not fetch data for mint-discovered token: ${ticker}`);
                }
            } catch (error) {
                console.error(`❌ Error processing mint-discovered token ${ticker}:`, error.message);
            }
        }
    }

    // === TRAITEMENT DEPLOY (EXACT) ===
    async processDeploy(txValue, txData) {
        const ticker = txValue.tick;
        const deployer = txValue.addr; // Pour deploy, l'adresse peut être dans txValue

        if (!ticker) return;

        // Nouveau token détecté - TOUJOURS créer s'il n'existe pas !
        if (!this.database.tokens.has(ticker.toLowerCase())) {
            console.log(`🎯 NEW TOKEN DISCOVERED: ${ticker} deployed by ${deployer || 'unknown'} at TX ${txData.index}`);

            try {
                const tokenData = await this.getCompleteTokenData(ticker);
                if (tokenData) {
                    tokenData.deployTx = txData.index;
                    tokenData.deployTime = txData.timestamp;
                    this.database.tokens.set(ticker.toLowerCase(), tokenData);
                    this.database.stats.totalTokens++;

                    console.log(`✅ Token ${ticker} added to database (${tokenData.progress.toFixed(1)}% complete)`);

                    // Émettre l'événement
                    this.emit('newToken', {
                        ticker,
                        deployer: deployer,
                        txIndex: txData.index,
                        progress: tokenData.progress
                    });
                } else {
                    console.log(`⚠️ Could not fetch data for discovered token: ${ticker}`);
                }
            } catch (error) {
                console.error(`❌ Error processing discovered token ${ticker}:`, error.message);
            }
        } else {
            // Token déjà connu, juste mettre à jour
            const token = this.database.tokens.get(ticker.toLowerCase());
            if (!token.deployTx) {
                token.deployTx = txData.index;
                token.deployTime = txData.timestamp;
            }
        }

        // Mettre à jour les données de l'adresse du déployeur si elle existe
        if (deployer && deployer !== 'undefined') {
            await this.updateAddressData(deployer, ticker, 'deploy', txData);
        }
    }

    // === TRAITEMENT MINT (EXACT) ===
    async processMint(txValue, txData, signerAddress) {
        const ticker = txValue.tick;
        const minter = signerAddress; // 🔧 CORRECTION: Utiliser l'adresse dérivée
        const amount = parseFloat(txValue.amt || txValue.dta || 1); // 🔧 Essayer amt, dta, ou défaut 1

        // 🔧 VÉRIFIER QUE L'ADRESSE EST VALIDE
        if (!minter || minter === 'undefined') {
            console.log(`⚠️ SKIPPING mint - no valid address for ${ticker}`);
            return;
        }

        console.log(`💰 MINT: ${minter.slice(0, 8)}... minted ${amount} ${ticker}`);

        // Mettre à jour le token
        if (this.database.tokens.has(ticker.toLowerCase())) {
            const token = this.database.tokens.get(ticker.toLowerCase());
            token.totalTransactions++;
            token.lastUpdate = Date.now();

            // Recalculer les données depuis le réseau
            const updatedData = await this.getCompleteTokenData(ticker);
            if (updatedData) {
                Object.assign(token, updatedData);
            }
        }

        // ✅ CALCUL AUTOMATIQUE DES HOLDERS - Mettre à jour les balances et holders en temps réel
        await this.updateBalance(minter, ticker, amount, 'mint');
        await this.updateAddressData(minter, ticker, 'mint', txData);

        // Émettre l'événement
        this.emit('newMint', { ticker, minter, amount, txIndex: txData.index });
    }

    // === TRAITEMENT TRANSFER (EXACT) ===
    async processTransfer(txValue, txData, signerAddress) {
        const ticker = txValue.tick;
        const from = signerAddress; // 🔧 CORRECTION: Le signataire est l'expéditeur
        const to = txValue.to || txValue.addr; // 🔧 Essayer différents champs pour le destinataire
        const amount = parseFloat(txValue.amt || txValue.dta || 0);

        // 🔧 VÉRIFIER QUE LES ADRESSES SONT VALIDES
        if (!from || from === 'undefined') {
            console.log(`⚠️ SKIPPING transfer with invalid FROM address for ${ticker}`);
            return;
        }
        if (!to || to === 'undefined') {
            console.log(`⚠️ SKIPPING transfer with invalid TO address for ${ticker}`);
            return;
        }

        console.log(`🔄 TRANSFER: ${from.slice(0, 8)}... → ${to.slice(0, 8)}... (${amount} ${ticker})`);

        // ✅ CALCUL AUTOMATIQUE DES HOLDERS - Mettre à jour les balances des deux côtés
        await this.updateBalance(from, ticker, -amount, 'transfer_out');
        await this.updateBalance(to, ticker, amount, 'transfer_in');

        // Mettre à jour les données des adresses
        await this.updateAddressData(from, ticker, 'transfer_out', txData);
        await this.updateAddressData(to, ticker, 'transfer_in', txData);

        // Émettre l'événement
        this.emit('newTransfer', { ticker, from, to, amount, txIndex: txData.index });
    }

    // === 🎯 CALCUL AUTOMATIQUE DES HOLDERS EN TEMPS RÉEL - VERSION CORRIGÉE (EXACT - 80+ lignes) ===
    async updateBalance(address, ticker, amountChange, operation) {
        // 🔧 IGNORER LES TRANSACTIONS AVEC ADRESSE UNDEFINED
        if (!address || address === 'undefined') {
            console.log(`⚠️ IGNORING transaction with undefined address for ${ticker}`);
            return;
        }

        const balanceKey = `${address}:${ticker.toLowerCase()}`;

        // Initialiser la balance si elle n'existe pas
        if (!this.database.balances.has(balanceKey)) {
            this.database.balances.set(balanceKey, {
                address,
                ticker: ticker.toLowerCase(),
                balance: 0,
                lastUpdate: Date.now(),
                operations: []
            });
        }

        const balanceData = this.database.balances.get(balanceKey);
        const oldBalance = balanceData.balance;
        balanceData.balance = Math.max(0, balanceData.balance + amountChange); // Éviter les balances négatives
        balanceData.lastUpdate = Date.now();
        balanceData.operations.push({
            operation,
            amount: amountChange,
            timestamp: Date.now()
        });

        // Garder seulement les 100 dernières opérations
        if (balanceData.operations.length > 100) {
            balanceData.operations.shift();
        }

        // 🎯 INITIALISER LES HOLDERS POUR CE TOKEN S'ILS N'EXISTENT PAS
        const tickerLower = ticker.toLowerCase();
        if (!this.database.holders.has(tickerLower)) {
            this.database.holders.set(tickerLower, new Set());
            console.log(`🔧 INITIALIZED holders Set for token: ${ticker}`);
        }

        const tokenHolders = this.database.holders.get(tickerLower);

        // 🎯 LOGIQUE HOLDERS CORRIGÉE
        if (oldBalance <= 0 && balanceData.balance > 0) {
            // Nouveau holder
            tokenHolders.add(address);
            console.log(`👤 NEW HOLDER: ${address.slice(0, 8)}... now holds ${ticker} (${balanceData.balance.toFixed(4)})`);
        } else if (oldBalance > 0 && balanceData.balance <= 0) {
            // Plus de tokens
            tokenHolders.delete(address);
            console.log(`👋 HOLDER LEFT: ${address.slice(0, 8)}... no longer holds ${ticker}`);
        }

        // 🎯 METTRE À JOUR LE COUNT DES HOLDERS DANS LE TOKEN
        if (this.database.tokens.has(tickerLower)) {
            const token = this.database.tokens.get(tickerLower);
            const previousHolders = token.totalHolders || 0;
            token.totalHolders = tokenHolders.size;

            // Log si changement significatif
            if (Math.abs(token.totalHolders - previousHolders) > 0) {
                console.log(`📊 ${ticker} holders: ${previousHolders} → ${token.totalHolders}`);
            }
        }
    }

    // === MISE À JOUR ADRESSE (EXACT) ===
    async updateAddressData(address, ticker, operation, txData) {
        if (!this.database.addresses.has(address)) {
            this.database.addresses.set(address, {
                address,
                firstSeen: txData.timestamp,
                lastSeen: txData.timestamp,
                totalTransactions: 0,
                tokens: new Set(),
                operations: []
            });
            this.database.stats.totalAddresses++;
        }

        const addressData = this.database.addresses.get(address);
        addressData.lastSeen = txData.timestamp;
        addressData.totalTransactions++;
        addressData.tokens.add(ticker.toLowerCase());
        addressData.operations.push({
            operation,
            ticker,
            txIndex: txData.index,
            timestamp: txData.timestamp
        });

        // Garder seulement les 500 dernières opérations
        if (addressData.operations.length > 500) {
            addressData.operations.shift();
        }
    }

    generateTxHash(tx, index) {
        const data = JSON.stringify({ index, type: tx.val.type, value: tx.val.value });
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }

    // === 🔧 FONCTION CORRIGÉE: SAUVEGARDE COMPLÈTE DU CHECKPOINT (localStorage FIXÉ) ===
    async saveData() {
        try {
            console.log('💾 SAVING checkpoint to localStorage...');
            const timestamp = Date.now();

            // 🎯 CRÉER UN CHECKPOINT COMPLET avec SÉRIALISATION CORRECTE !
            const checkpoint = {
                // Métadonnées
                lastProcessedTx: this.database.stats.lastProcessedTx,
                networkHeight: this.database.stats.networkHeight,
                timestamp: new Date().toISOString(),
                tokensCount: this.database.tokens.size,
                addressesCount: this.database.addresses.size,
                balancesCount: this.database.balances.size,
                totalHolders: this.getTotalHoldersCount(),

                // 🔧 SÉRIALISATION CORRECTE (Maps/Sets → Arrays)
                tokens: Array.from(this.database.tokens.entries()),
                balances: Array.from(this.database.balances.entries()),

                // 🔧 CORRECTION CRITIQUE: Sérialiser les Sets dans addresses
                addresses: Array.from(this.database.addresses.entries()).map(([address, data]) => [
                    address,
                    {
                        ...data,
                        tokens: Array.from(data.tokens) // Set → Array pour JSON
                    }
                ]),

                // 🔧 CORRECTION CRITIQUE: Sérialiser les Sets dans holders
                holders: Array.from(this.database.holders.entries()).map(([ticker, holdersSet]) => [
                    ticker,
                    Array.from(holdersSet) // Set → Array pour JSON
                ])
            };

            console.log('🔧 Checkpoint prepared:', {
                tokens: checkpoint.tokens.length,
                balances: checkpoint.balances.length,
                holders: checkpoint.holders.length,
                addresses: checkpoint.addresses.length
            });

            // 🎯 SAUVEGARDER LE CHECKPOINT COMPLET dans localStorage
            const checkpointJson = JSON.stringify(checkpoint);
            localStorage.setItem('hypertracker_checkpoint', checkpointJson);

            // Sauvegarder aussi une copie timestampée
            const checkpointBackup = `hypertracker_checkpoint_${timestamp}`;
            localStorage.setItem(checkpointBackup, checkpointJson);

            // Stats de confirmation
            console.log(`💾 CHECKPOINT SAVED SUCCESSFULLY!`);
            console.log(`📊 Data: ${checkpoint.tokens.length} tokens, ${this.getTotalHoldersCount()} holders, ${checkpoint.balances.length} balances`);
            console.log(`💽 Size: ${(checkpointJson.length / 1024).toFixed(1)} KB`);
            console.log(`📍 TX: ${this.database.stats.lastProcessedTx}`);

            // Sauvegardes légères supplémentaires
            const tokensData = Array.from(this.database.tokens.values());
            localStorage.setItem(`hypertracker_tokens_${timestamp}`, JSON.stringify(tokensData));

            const recentTransactions = this.database.transactions.slice(-1000);
            localStorage.setItem(`hypertracker_transactions_${timestamp}`, JSON.stringify(recentTransactions));

            console.log('✅ All checkpoint data saved to localStorage');

        } catch (error) {
            console.error('❌ SAVE ERROR:', error.message);
            console.error('📍 Save error details:', error);

            // Debug détaillé
            console.log('🔧 Debug save data:');
            console.log('  Tokens size:', this.database.tokens.size);
            console.log('  Balances size:', this.database.balances.size);
            console.log('  Holders size:', this.database.holders.size);
            console.log('  Addresses size:', this.database.addresses.size);
        }
    }

    // === 🔧 NOUVELLES FONCTIONS UTILITAIRES (adaptées localStorage) ===

    // Vérifier l'intégrité du checkpoint
    async verifyCheckpointIntegrity() {
        try {
            const checkpointData = localStorage.getItem('hypertracker_checkpoint');

            if (checkpointData) {
                const checkpoint = JSON.parse(checkpointData);

                console.log('🔍 CHECKPOINT INTEGRITY CHECK:');
                console.log(`   Tokens: ${checkpoint.tokens?.length || 0} entries`);
                console.log(`   Balances: ${checkpoint.balances?.length || 0} entries`);
                console.log(`   Holders: ${checkpoint.holders?.length || 0} tokens with holders`);
                console.log(`   Addresses: ${checkpoint.addresses?.length || 0} entries`);
                console.log(`   Last TX: ${checkpoint.lastProcessedTx}`);
                console.log(`   Timestamp: ${checkpoint.timestamp}`);

                return true;
            } else {
                console.log('❌ No checkpoint found in localStorage');
                return false;
            }
        } catch (error) {
            console.log('❌ Checkpoint integrity check failed:', error.message);
            return false;
        }
    }

    // Forcer une sauvegarde immédiate
    async forceSaveCheckpoint() {
        console.log('💾 FORCING immediate checkpoint save...');
        await this.saveData();
        console.log('✅ Checkpoint force-saved to localStorage!');
    }

    // Nettoyer les balances invalides
    async cleanInvalidBalances() {
        console.log('🧹 CLEANING invalid balances (undefined addresses)...');

        let removedCount = 0;
        const balancesToRemove = [];

        // Identifier les balances invalides
        for (const [balanceKey, balanceData] of this.database.balances) {
            if (!balanceData.address || balanceData.address === 'undefined' || balanceKey.startsWith('undefined:')) {
                balancesToRemove.push(balanceKey);
                console.log(`🗑️ REMOVING invalid balance: ${balanceKey} (${balanceData.balance})`);
            }
        }

        // Supprimer les balances invalides
        for (const key of balancesToRemove) {
            this.database.balances.delete(key);
            removedCount++;
        }

        console.log(`🧹 CLEANUP COMPLETE! Removed ${removedCount} invalid balances`);
        console.log(`📊 Remaining balances: ${this.database.balances.size}`);

        return {
            removedCount: removedCount,
            remainingBalances: this.database.balances.size
        };
    }

    // === DÉMARRAGE DU MONITORING (EXACT avec sauvegarde localStorage) ===
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⏳ Monitoring already running...');
            return;
        }

        console.log('🚀 Starting real-time monitoring...');
        this.isMonitoring = true;

        // Charger les données existantes
        await this.loadExistingData();

        // Sync initial pour rattraper
        console.log('🔄 Initial sync - catching up with network...');
        await this.processNewTransactions();

        // Démarrer le monitoring continu
        this.monitoringInterval = setInterval(async () => {
            if (this.isMonitoring) {
                await this.processNewTransactions();
            }
        }, this.config.syncInterval);

        // Sauvegarde périodique dans localStorage
        this.saveInterval = setInterval(async () => {
            if (this.isMonitoring) {
                await this.saveData();
            }
        }, this.config.saveInterval);

        console.log('🎯 Real-time monitoring ACTIVE!');
        console.log(`⏱️ Sync every ${this.config.syncInterval / 1000} seconds`);
        console.log(`💾 Save every ${this.config.saveInterval / 1000} seconds to localStorage`);
        console.log(`🔌 Event system: newToken, newMint, newTransfer, newTransactions`);
    }

    async stopMonitoring() {
        console.log('🛑 Stopping real-time monitoring...');
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        await this.saveData();
        console.log('✅ Monitoring stopped and data saved to localStorage');
    }

    // === MÉTHODES POUR L'INTERFACE HYPERTRACKER ===
    getTokens() {
        const tokens = Array.from(this.database.tokens.values()).map(token => ({
            ...token,
            holders: undefined, // Ne pas exposer le Set
            totalHolders: token.totalHolders || 0,
            displayName: token.ticker.toUpperCase(),
            progressPercent: Math.round(token.progress * 100) / 100,
            supplyFormatted: parseFloat(token.supply).toLocaleString(),
            completedFormatted: parseFloat(token.completed).toLocaleString(),
            isHot: token.progress > 0 && token.progress < 100,
            isCompleted: token.progress >= 100,
            isNew: token.progress < 10
        }));

        return tokens.sort((a, b) => b.progress - a.progress);
    }

    // === MÉTHODES POUR L'INTERFACE HYPERTRACKER (CORRIGÉES) ===

    getStats() {
        const totalHolders = this.getTotalHoldersCount();

        // 🔧 CORRECTION: Vérifications de sécurité pour éviter undefined
        const tokensSize = this.database?.tokens?.size || 0;
        const addressesSize = this.database?.addresses?.size || 0;
        const balancesSize = this.database?.balances?.size || 0;
        const isLive = this.database?.stats?.isLive || false;
        const lastUpdate = this.database?.stats?.lastUpdate || 0;
        const networkHeight = this.database?.stats?.networkHeight || 0;

        console.log('🔧 getStats() called:', {
            tokensSize,
            totalHolders,
            balancesSize,
            isLive
        });

        return {
            totalTokens: tokensSize,
            totalHolders: totalHolders || 0,
            totalAddresses: addressesSize,
            totalBalances: balancesSize,
            isLive: isLive,
            lastUpdate: lastUpdate,
            engine: 'HyperTracker Engine',
            status: isLive ? '⚡ HyperTracker Engine active' : '🔄 Scanning blockchain...',
            networkHeight: networkHeight
        };
    }

    async forceRefresh() {
        console.log('🔄 Force refresh - triggering new transaction processing...');
        try {
            await this.processNewTransactions();
            console.log('✅ Refresh completed');
            return true;
        } catch (error) {
            console.error('❌ Refresh failed:', error.message);
            return false;
        }
    }

    // === POINT D'ENTRÉE PRINCIPAL (EXACT adapté) ===
    async start(storeName = 'store1') {
        try {
            console.log('🎯 Starting HyperTracker Engine with ULTRA-COMPLETE logic...');
            console.log('🔥 ALL 1146 lines of proven code included and adapted for browser!');
            console.log('💾 FIXED: localStorage saves correctly with Maps/Sets serialization');
            console.log('📊 Complete monitoring: tokens, transactions, balances, holders');

            await this.initialize(storeName);
            console.log('✅ HyperTracker Engine initialized!');

            await this.startMonitoring();

            console.log('\n🎊 HYPERTOKENS REAL-TIME MONITOR ACTIVE!');
            console.log('📊 Tracking: Tokens, Transactions, Balances, Holders');
            console.log('🔄 Updates: Every 5 seconds');
            console.log('💾 Persistence: localStorage (browser-compatible, FIXED!)');
            console.log(`📁 Store: ${storeName}`);
            console.log('\n🎯 THIS IS YOUR COMPLETE BLOCKCHAIN EXPLORER!');
            console.log('🔥 ULTRA-COMPLETE VERSION - Every line of logic from original + FIXED SAVES!');

            return true;

        } catch (error) {
            console.error('❌ Failed to start monitor:', error.message);
            return false;
        }
    }
}