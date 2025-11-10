import axios from "axios";

export interface PartyMember {
  id: number;
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  affinity: string;
  experience: number;
  media_url?: string;
}

export interface RpgEncounterPayload {
  attacker: {
    id: number;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    affinity: string;
  };
  defender: {
    id: number;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    affinity: string;
  };
  turns: BattleTurn[];
  winner: "player" | "enemy";
  xpGained: number;
  bitsReward: number;
}

export interface BattleTurn {
  turnNumber: number;
  actingNftId: number;
  targetNftId: number;
  moveId: number;
  moveName?: string;
  damageDone: number;
  crit: boolean;
  effectiveness: number;
  statusApplied?: string | null;
  attackerHpAfter: number;
  defenderHpAfter: number;
}

export async function getMyParty(): Promise<PartyMember[]> {
  const res = await axios.get("/api/rpg/party");
  return res.data.party;
}

export async function startEncounter(attackerNftId: number): Promise<RpgEncounterPayload> {
  const res = await axios.post("/api/rpg/encounter", { attackerNftId });
  return res.data;
}

