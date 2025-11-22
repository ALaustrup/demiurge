"use client";

import { motion } from "framer-motion";
import { Activity, CircuitBoard, Sparkles, Users, Wallet, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { DEMIURGE_RPC_URL, GENESIS_ARCHON_ADDRESS } from "@/config/demiurge";

type ChainInfo = {
  height: number;
};

type Nft = {
  id: number;
  owner: string;
  creator: string;
  fabric_root_hash: string;
  royalty_bps?: number;
};

export default function HomePage() {
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [genesisBalance, setGenesisBalance] = useState<number | null>(null);
  const [genesisNfts, setGenesisNfts] = useState<Nft[]>([]);
  const [isArchon, setIsArchon] = useState<boolean>(false);
  const [minting, setMinting] = useState(false);
  const [genesisError, setGenesisError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChainInfo = async () => {
      try {
        const res = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_getChainInfo",
          params: null,
          id: 1,
        });

        if (res.data.error) {
          setRpcError(res.data.error.message ?? "Unknown RPC error");
          setChainInfo(null);
          return;
        }

        setChainInfo(res.data.result as ChainInfo);
        setRpcError(null);
      } catch (err: any) {
        setRpcError(err.message ?? "Failed to reach Demiurge node");
        setChainInfo(null);
      }
    };

    fetchChainInfo();
    const interval = setInterval(fetchChainInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Genesis Archon data
  useEffect(() => {
    const fetchGenesisData = async () => {
      try {
        // Fetch balance
        const balanceRes = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_getBalance",
          params: { address: GENESIS_ARCHON_ADDRESS },
          id: 2,
        });
        if (balanceRes.data.result) {
          setGenesisBalance(balanceRes.data.result.balance || 0);
        }

        // Fetch Archon status
        const archonRes = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_isArchon",
          params: { address: GENESIS_ARCHON_ADDRESS },
          id: 3,
        });
        if (archonRes.data.result) {
          setIsArchon(archonRes.data.result.is_archon || false);
        }

        // Fetch NFTs
        const nftsRes = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_getNftsByOwner",
          params: { address: GENESIS_ARCHON_ADDRESS },
          id: 4,
        });
        if (nftsRes.data.result && nftsRes.data.result.nfts) {
          setGenesisNfts(nftsRes.data.result.nfts);
        }
        setGenesisError(null);
      } catch (err: any) {
        setGenesisError(err.message ?? "Failed to fetch Genesis data");
      }
    };

    fetchGenesisData();
    const interval = setInterval(fetchGenesisData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMintTestNft = async () => {
    if (minting) return;
    setMinting(true);
    setGenesisError(null);

    try {
      // Optional: Call faucet first (only in dev)
      if (process.env.NODE_ENV !== "production") {
        try {
          await axios.post(DEMIURGE_RPC_URL, {
            jsonrpc: "2.0",
            method: "cgt_devFaucet",
            params: { address: GENESIS_ARCHON_ADDRESS },
            id: 5,
          });
        } catch (e) {
          // Faucet might fail, continue anyway
        }
      }

      // Generate dummy hashes for test NFT
      const fabricHash = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      // Mint NFT
      const mintRes = await axios.post(DEMIURGE_RPC_URL, {
        jsonrpc: "2.0",
        method: "cgt_mintDgenNft",
        params: {
          owner: GENESIS_ARCHON_ADDRESS,
          fabric_root_hash: fabricHash,
          forge_model_id: null,
          forge_prompt_hash: null,
          name: "Genesis Relic",
          description: "A test D-GEN NFT minted from the portal",
        },
        id: 6,
      });

      if (mintRes.data.error) {
        setGenesisError(mintRes.data.error.message ?? "Mint failed");
      } else {
        // Refresh data
        const balanceRes = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_getBalance",
          params: { address: GENESIS_ARCHON_ADDRESS },
          id: 7,
        });
        if (balanceRes.data.result) {
          setGenesisBalance(balanceRes.data.result.balance || 0);
        }

        const nftsRes = await axios.post(DEMIURGE_RPC_URL, {
          jsonrpc: "2.0",
          method: "cgt_getNftsByOwner",
          params: { address: GENESIS_ARCHON_ADDRESS },
          id: 8,
        });
        if (nftsRes.data.result && nftsRes.data.result.nfts) {
          setGenesisNfts(nftsRes.data.result.nfts);
        }
      }
    } catch (err: any) {
      setGenesisError(err.message ?? "Failed to mint NFT");
    } finally {
      setMinting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-12">
      {/* HERO */}
      <section className="grid gap-10 md:grid-cols-[2fr,1fr] items-center">
        <div className="space-y-6">
          <motion.h1
            className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Demiurge
            <span className="block text-xl font-normal text-slate-400 sm:text-2xl">
              The Sovereign Digital Pantheon for creators, gamers, and AI.
            </span>
          </motion.h1>

          <motion.p
            className="max-w-2xl text-sm text-slate-300 sm:text-base"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            A sovereign L1 blockchain where{" "}
            <span className="font-semibold text-sky-400">Archons</span> (creators)
            and{" "}
            <span className="font-semibold text-violet-300">Nomads</span> (explorers)
            mint, trade, and experience D-GEN NFTs, streamed over the Fabric P2P
            network and traded in the Abyss marketplace, powered by the Creator God
            Token (CGT).
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <button className="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/30 hover:bg-sky-400">
              Read the Architecture
            </button>
            <button className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 hover:border-slate-500">
              For Archons (Creators)
            </button>
            <button className="rounded-full border border-slate-800 px-5 py-2 text-sm text-slate-300 hover:border-slate-600">
              For Nomads (Players)
            </button>
          </motion.div>
        </div>

        {/* LIVE CHAIN CARD */}
        <motion.div
          className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-sky-900/30"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Activity className="h-4 w-4 text-sky-400" />
              Live Chain Status
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              PHASE 5 • DEVNET
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            {chainInfo && !rpcError && (
              <>
                <div className="flex justify-between">
                  <span>Height</span>
                  <span className="font-mono text-sky-300">
                    #{chainInfo.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>RPC</span>
                  <span className="max-w-[180px] truncate font-mono text-slate-400">
                    {DEMIURGE_RPC_URL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Health</span>
                  <span className="font-semibold text-emerald-400">
                    NODE ONLINE
                  </span>
                </div>
              </>
            )}

            {rpcError && (
              <div className="space-y-2">
                <p className="text-xs text-rose-400">
                  Unable to reach Demiurge node.
                </p>
                <p className="text-[11px] text-slate-500">
                  Check that the Rust node is running on{" "}
                  <span className="font-mono">127.0.0.1:8545</span> or set{" "}
                  <span className="font-mono">NEXT_PUBLIC_DEMIURGE_RPC_URL</span>.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* PILLARS */}
      <section className="grid gap-6 md:grid-cols-3">
        <PillarCard
          icon={<CircuitBoard className="h-4 w-4" />}
          title="Sovereign L1"
          body="A custom Rust L1 with Forge PoW, CGT, and verifiable runtime modules for bank, NFTs, Fabric, and Abyss."
        />
        <PillarCard
          icon={<Users className="h-4 w-4" />}
          title="Archons & Nomads"
          body="Creators become Archons, minting D-GEN NFTs and seeding the Fabric. Nomads roam, collect, and experience worlds."
        />
        <PillarCard
          icon={<Sparkles className="h-4 w-4" />}
          title="D-GEN NFTs"
          body="AI-native, provenance-rich NFTs anchored to Fabric content and traded in the Abyss marketplace with programmable royalties."
        />
      </section>

      {/* GENESIS ARCHON DASHBOARD */}
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Genesis Archon Dashboard
          </h2>
          {isArchon && (
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
              ARCHON
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Address & Balance */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Wallet className="h-4 w-4 text-sky-400" />
              Address
            </div>
            <p className="font-mono text-xs text-slate-400 break-all">
              {GENESIS_ARCHON_ADDRESS.slice(0, 8)}...{GENESIS_ARCHON_ADDRESS.slice(-8)}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mt-3">
              <Coins className="h-4 w-4 text-emerald-400" />
              CGT Balance
            </div>
            <p className="text-lg font-mono font-semibold text-emerald-400">
              {genesisBalance !== null
                ? genesisBalance.toLocaleString()
                : "—"}{" "}
              CGT
            </p>
          </div>

          {/* NFTs */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Sparkles className="h-4 w-4 text-violet-400" />
                D-GEN NFTs
              </div>
              <span className="text-xs text-slate-500">
                {genesisNfts.length} owned
              </span>
            </div>
            {genesisNfts.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {genesisNfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="rounded-lg border border-slate-700 bg-slate-800/30 p-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sky-300">#{nft.id}</span>
                      <span className="text-slate-500 text-[10px]">
                        {nft.fabric_root_hash.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No NFTs yet</p>
            )}
          </div>
        </div>

        {/* Mint Button (Dev Only) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="pt-2">
            <button
              onClick={handleMintTestNft}
              disabled={minting || !isArchon}
              className="rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-slate-50 shadow-lg shadow-violet-500/30 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {minting ? "Minting..." : "Mint Test NFT"}
            </button>
          </div>
        )}

        {genesisError && (
          <p className="text-xs text-rose-400 mt-2">{genesisError}</p>
        )}
      </section>

      {/* HIGH-LEVEL ARCHITECTURE TEXT BLOCK */}
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          The Demiurge Stack
        </h2>
        <p className="text-sm text-slate-300">
          Demiurge is a modular but sovereign L1: Archon-operated nodes run Forge
          PoW and host Fabric content; the CGT bank module tracks balances; the
          D-GEN runtime mints NFTs with embedded AI provenance; Fabric anchors
          immutable content roots; and Abyss provides a native marketplace for
          licenses and assets.
        </p>
        <p className="text-xs text-slate-500">
          This portal is a first window into the Pantheon. Future versions will
          let you connect a wallet, claim your Archon identity, mint D-GEN NFTs,
          and browse live Fabric worlds and Abyss listings directly.
        </p>
      </section>
    </main>
  );
}

function PillarCard(props: { icon: React.ReactNode; title: string; body: string }) {
  const { icon, title, body } = props;
  return (
    <motion.div
      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-md shadow-slate-950/40"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-xs text-slate-300">{body}</p>
    </motion.div>
  );
}
