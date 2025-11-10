'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Card,
  CardBody,
  Text,
  Button,
  Spinner,
  HStack,
  Badge,
  Select,
  FormControl,
  FormLabel,
  SimpleGrid,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import { useHeroStore } from '@/store/heroStore';
import { getMyHeroicRanking, getHeroicLeaderboard, HeroicRanking, Season } from '@/utils/ladderApi';

interface Battle {
  id: number;
  attacker_nft_name: string;
  defender_nft_name: string;
  attacker_username: string;
  defender_username: string;
  winner_username: string | null;
  status: string;
  bits_reward: number | null;
  attacker_power?: number;
  defender_power?: number;
  battle_type?: string;
  is_ranked?: boolean;
}

interface NFT {
  id: number;
  name: string;
  battle_power: number;
  level: number;
}

interface BattleTurn {
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

interface BattleResult {
  battleId: number;
  winnerUserId: number;
  loserUserId: number;
  winnerNftId: number;
  loserNftId: number;
  bitsReward: number;
  status: string;
  turns: BattleTurn[];
  attacker: {
    nftId: number;
    level: number;
    experience: number;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    affinity: string;
  };
  defender: {
    nftId: number;
    level: number;
    experience: number;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    affinity: string;
  };
}

export default function BattlesPage() {
  const { user } = useAuthStore();
  const { hero, loadHero } = useHeroStore();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [allNFTs, setAllNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [attackerNFTId, setAttackerNFTId] = useState('');
  const [defenderNFTId, setDefenderNFTId] = useState('');
  const [battleType, setBattleType] = useState<'normal' | 'heroic'>('normal');
  const [isRankedBattle, setIsRankedBattle] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [myRanking, setMyRanking] = useState<HeroicRanking | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isResultOpen, onOpen: onResultOpen, onClose: onResultClose } = useDisclosure();
  const { isOpen: isHeroicOpen, onOpen: onHeroicOpen, onClose: onHeroicClose } = useDisclosure();
  const { isOpen: isRankedOpen, onOpen: onRankedOpen, onClose: onRankedClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchBattles();
      fetchMyNFTs();
      fetchAllNFTs();
      loadHero();
      fetchMyRanking();
      fetchLeaderboard();
    }
  }, [user]);

  const fetchMyRanking = async () => {
    try {
      const data = await getMyHeroicRanking();
      setMyRanking(data.ranking);
      setSeason(data.season);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await getHeroicLeaderboard(50, 0);
      setLeaderboard(data.entries);
      if (data.season && !season) {
        setSeason(data.season);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchBattles = async () => {
    try {
      const response = await api.get('/battle/my');
      setBattles(response.data.battles);
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyNFTs = async () => {
    try {
      const response = await api.get('/nft/my');
      setMyNFTs(response.data.nfts);
    } catch (error) {
      console.error('Error fetching my NFTs:', error);
    }
  };

  const fetchAllNFTs = async () => {
    try {
      const response = await api.get('/nft/gallery?limit=50');
      setAllNFTs(response.data.nfts);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    }
  };

  const handleStartBattle = async () => {
    if (battleType === 'heroic') {
      if (!defenderNFTId) {
        toast({
          title: 'Select Defender',
          description: 'Please select a defender NFT',
          status: 'warning',
          duration: 3000,
        });
        return;
      }
    } else {
      if (!attackerNFTId || !defenderNFTId) {
        toast({
          title: 'Select NFTs',
          description: 'Please select both attacker and defender NFTs',
          status: 'warning',
          duration: 3000,
        });
        return;
      }
    }

    try {
      await api.post('/battle', {
        attackerNFTId: battleType === 'heroic' ? undefined : parseInt(attackerNFTId),
        defenderNFTId: parseInt(defenderNFTId),
        battleType,
        ranked: isRankedBattle,
      });
      toast({
        title: 'Battle Started!',
        description: battleType === 'heroic' ? 'Your Heroic battle has been initiated!' : 'Your battle has been initiated',
        status: 'success',
        duration: 3000,
      });
      onClose();
      onHeroicClose();
      setBattleType('normal');
      setAttackerNFTId('');
      setDefenderNFTId('');
      fetchBattles();
    } catch (error: any) {
      toast({
        title: 'Battle Failed',
        description: error.response?.data?.message || 'Failed to start battle',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCompleteBattle = async (battleId: number) => {
    try {
      const response = await api.post(`/battle/${battleId}/resolve`);
      setBattleResult(response.data);
      toast({
        title: 'Battle Completed!',
        description: `Winner earned ${response.data.bitsReward} Bits!`,
        status: 'success',
        duration: 3000,
      });
      fetchBattles();
      // Refresh ranking if this was a ranked battle
      const completedBattle = battles.find(b => b.id === battleId);
      if (completedBattle?.is_ranked) {
        fetchMyRanking();
        fetchLeaderboard();
      }
      onResultOpen();
    } catch (error: any) {
      console.error('Error completing battle:', error);
      toast({
        title: 'Battle Failed',
        description: error.response?.data?.message || 'Failed to complete battle',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getEffectivenessText = (effectiveness: number): string => {
    if (effectiveness >= 2) return 'Super effective!';
    if (effectiveness <= 0.5) return 'Not very effective...';
    return '';
  };

  const getEffectivenessColor = (effectiveness: number): string => {
    if (effectiveness >= 2) return 'neon.green';
    if (effectiveness <= 0.5) return 'gray.400';
    return 'gray.300';
  };

  if (!user) {
    return (
      <Container maxW="container.xl" py={10}>
        <Box textAlign="center">
          <Text fontSize="xl" color="gray.400" mb={4}>
            Please login to view your battles
          </Text>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" color="neon.green" />
          <Text color="gray.400">Loading battles...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
              NFT WARS
            </Heading>
            <Text color="gray.400" mt={2} fontFamily="body">
              Battle your NFTs and earn Bits
            </Text>
          </Box>
          <HStack spacing={4}>
            {hero && (
              <Button variant="neon" onClick={onHeroicOpen} fontFamily="heading">
                HEROIC DUEL
              </Button>
            )}
            <Button variant="cyber" onClick={onOpen} fontFamily="heading">
              START BATTLE
            </Button>
          </HStack>
        </HStack>

        {hero && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h2" size="md" fontFamily="heading" color="neon.green">
                    YOUR HEROIC DNFT
                  </Heading>
                  <Badge colorScheme="purple" fontSize="sm" px={3} py={1} fontFamily="body">
                    SOULBOUND
                  </Badge>
                </HStack>
                <HStack spacing={4}>
                  <Text fontFamily="heading" color="neon.cyan">
                    {hero.name}
                  </Text>
                  <Badge colorScheme="cyan">Level {hero.level}</Badge>
                  <Badge colorScheme="green">{hero.experience} XP</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.400" fontFamily="body">
                  Use your Heroic DNFT in battles to earn 25% bonus XP and Bits!
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {!hero && (
          <Card>
            <CardBody>
              <VStack spacing={4}>
                <Text color="gray.400" fontFamily="body">
                  Forge a Heroic DNFT to join Heroic Battles and earn bonus rewards!
                </Text>
                <Button variant="cyber" onClick={() => window.location.href = '/profile'} fontFamily="heading">
                  FORGE HEROIC
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab fontFamily="heading">NORMAL</Tab>
            <Tab fontFamily="heading">HEROIC (CASUAL)</Tab>
            <Tab fontFamily="heading">HEROIC (RANKED)</Tab>
          </TabList>

          <TabPanels>
            {/* Normal Battles Tab */}
            <TabPanel>
              {battles.filter(b => !b.battle_type || b.battle_type === 'normal').length === 0 ? (
                <Box textAlign="center" py={20}>
                  <Text fontSize="xl" color="gray.400" mb={4}>
                    No normal battles yet. Start your first battle!
                  </Text>
                  <Button variant="cyber" onClick={onOpen} fontFamily="heading">
                    START BATTLE
                  </Button>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {battles.filter(b => !b.battle_type || b.battle_type === 'normal').map((battle) => (
              <Card key={battle.id} _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={2}>
                        <HStack spacing={2}>
                          <Text fontFamily="heading" fontSize="lg" color="neon.green">
                            {battle.attacker_nft_name}
                          </Text>
                          {battle.battle_type === 'heroic' && (
                            <Badge colorScheme="purple" fontSize="xs" fontFamily="body">
                              HEROIC
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.400" fontFamily="body">
                          {battle.attacker_username}
                        </Text>
                        {battle.attacker_power && (
                          <Badge colorScheme="cyan" fontFamily="body">
                            Power: {battle.attacker_power}
                          </Badge>
                        )}
                      </VStack>
                      <Text fontFamily="heading" fontSize="xl" color="neon.pink">
                        VS
                      </Text>
                      <VStack align="end" spacing={2}>
                        <Text fontFamily="heading" fontSize="lg" color="neon.green">
                          {battle.defender_nft_name}
                        </Text>
                        <Text fontSize="sm" color="gray.400" fontFamily="body">
                          {battle.defender_username}
                        </Text>
                        {battle.defender_power && (
                          <Badge colorScheme="cyan" fontFamily="body">
                            Power: {battle.defender_power}
                          </Badge>
                        )}
                      </VStack>
                    </HStack>
                    <HStack justify="space-between" pt={4} borderTop="1px solid" borderColor="cyber.500">
                      <Badge
                        colorScheme={battle.status === 'completed' ? 'green' : 'yellow'}
                        fontFamily="body"
                        px={3}
                        py={1}
                      >
                        {battle.status.toUpperCase()}
                      </Badge>
                      {battle.winner_username && (
                        <Text fontSize="sm" color="neon.green" fontFamily="body">
                          Winner: {battle.winner_username}
                        </Text>
                      )}
                      {battle.bits_reward && (
                        <Badge colorScheme="green" fontFamily="body">
                          +{battle.bits_reward} BITS
                        </Badge>
                      )}
                    </HStack>
                    {battle.status === 'pending' && (
                      <Button
                        variant="neon"
                        onClick={() => handleCompleteBattle(battle.id)}
                        fontFamily="heading"
                      >
                        RESOLVE BATTLE
                      </Button>
                    )}
                    {battle.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Fetch battle details if needed
                          handleCompleteBattle(battle.id);
                        }}
                        fontFamily="body"
                        borderColor="cyber.500"
                        color="gray.300"
                      >
                        VIEW LOG
                      </Button>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
            </TabPanel>

            {/* Heroic Casual Battles Tab */}
            <TabPanel>
              {battles.filter(b => b.battle_type === 'heroic' && !b.is_ranked).length === 0 ? (
                <Box textAlign="center" py={20}>
                  <Text fontSize="xl" color="gray.400" mb={4}>
                    No heroic casual battles yet.
                  </Text>
                  {hero && (
                    <Button variant="neon" onClick={onHeroicOpen} fontFamily="heading">
                      START HEROIC DUEL
                    </Button>
                  )}
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {battles.filter(b => b.battle_type === 'heroic' && !b.is_ranked).map((battle) => (
                    <Card key={battle.id} _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={2}>
                              <HStack spacing={2}>
                                <Text fontFamily="heading" fontSize="lg" color="neon.green">
                                  {battle.attacker_nft_name}
                                </Text>
                                <Badge colorScheme="purple" fontSize="xs" fontFamily="body">
                                  HEROIC
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" color="gray.400" fontFamily="body">
                                {battle.attacker_username}
                              </Text>
                            </VStack>
                            <Text fontFamily="heading" fontSize="xl" color="neon.pink">
                              VS
                            </Text>
                            <VStack align="end" spacing={2}>
                              <Text fontFamily="heading" fontSize="lg" color="neon.green">
                                {battle.defender_nft_name}
                              </Text>
                              <Text fontSize="sm" color="gray.400" fontFamily="body">
                                {battle.defender_username}
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack justify="space-between" pt={4} borderTop="1px solid" borderColor="cyber.500">
                            <Badge
                              colorScheme={battle.status === 'completed' ? 'green' : 'yellow'}
                              fontFamily="body"
                              px={3}
                              py={1}
                            >
                              {battle.status.toUpperCase()}
                            </Badge>
                            {battle.winner_username && (
                              <Text fontSize="sm" color="neon.green" fontFamily="body">
                                Winner: {battle.winner_username}
                              </Text>
                            )}
                            {battle.bits_reward && (
                              <Badge colorScheme="green" fontFamily="body">
                                +{battle.bits_reward} BITS
                              </Badge>
                            )}
                          </HStack>
                          {battle.status === 'pending' && (
                            <Button
                              variant="cyber"
                              onClick={() => handleCompleteBattle(battle.id)}
                              fontFamily="heading"
                            >
                              RESOLVE BATTLE
                            </Button>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </TabPanel>

            {/* Heroic Ranked Battles Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {season && myRanking && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between">
                          <Heading as="h3" size="md" fontFamily="heading" color="neon.green">
                            YOUR RANKING
                          </Heading>
                          <Badge colorScheme="purple" fontSize="md" px={3} py={1} fontFamily="body">
                            {myRanking.tier}
                          </Badge>
                        </HStack>
                        <SimpleGrid columns={2} spacing={4}>
                          <Box>
                            <Text fontSize="sm" color="gray.400" fontFamily="body">Rating</Text>
                            <Text fontSize="2xl" fontFamily="heading" color="neon.cyan">{myRanking.rating}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.400" fontFamily="body">Record</Text>
                            <Text fontSize="lg" fontFamily="heading" color="neon.green">
                              {myRanking.wins}W - {myRanking.losses}L
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.400" fontFamily="body">Streak</Text>
                            <Text fontSize="lg" fontFamily="heading" color={myRanking.streak > 0 ? 'neon.green' : 'red.400'}>
                              {myRanking.streak > 0 ? '+' : ''}{myRanking.streak}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.400" fontFamily="body">Peak</Text>
                            <Text fontSize="lg" fontFamily="heading" color="neon.pink">{myRanking.highest_rating}</Text>
                          </Box>
                        </SimpleGrid>
                        <Text fontSize="xs" color="gray.500" fontFamily="body">
                          Season: {season.name}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {!season && (
                  <Card>
                    <CardBody>
                      <Text color="gray.400" fontFamily="body" textAlign="center">
                        No active ranked season. Ranked battles are currently unavailable.
                      </Text>
                    </CardBody>
                  </Card>
                )}

                {season && !hero && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4}>
                        <Text color="gray.400" fontFamily="body">
                          Forge a Heroic DNFT to participate in ranked battles!
                        </Text>
                        <Button variant="cyber" onClick={() => window.location.href = '/profile'} fontFamily="heading">
                          FORGE HEROIC
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {season && hero && (
                  <HStack spacing={4}>
                    <Button variant="neon" onClick={onRankedOpen} fontFamily="heading" size="lg">
                      START RANKED BATTLE
                    </Button>
                  </HStack>
                )}

                {battles.filter(b => b.battle_type === 'heroic' && b.is_ranked).length === 0 ? (
                  <Box textAlign="center" py={10}>
                    <Text fontSize="md" color="gray.400" fontFamily="body">
                      No ranked battles yet. Start your first ranked battle!
                    </Text>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    {battles.filter(b => b.battle_type === 'heroic' && b.is_ranked).map((battle) => (
                      <Card key={battle.id} _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                        <CardBody>
                          <VStack align="stretch" spacing={4}>
                            <HStack justify="space-between">
                              <VStack align="start" spacing={2}>
                                <HStack spacing={2}>
                                  <Text fontFamily="heading" fontSize="lg" color="neon.green">
                                    {battle.attacker_nft_name}
                                  </Text>
                                  <Badge colorScheme="purple" fontSize="xs" fontFamily="body">
                                    RANKED
                                  </Badge>
                                </HStack>
                                <Text fontSize="sm" color="gray.400" fontFamily="body">
                                  {battle.attacker_username}
                                </Text>
                              </VStack>
                              <Text fontFamily="heading" fontSize="xl" color="neon.pink">
                                VS
                              </Text>
                              <VStack align="end" spacing={2}>
                                <Text fontFamily="heading" fontSize="lg" color="neon.green">
                                  {battle.defender_nft_name}
                                </Text>
                                <Text fontSize="sm" color="gray.400" fontFamily="body">
                                  {battle.defender_username}
                                </Text>
                              </VStack>
                            </HStack>
                            <HStack justify="space-between" pt={4} borderTop="1px solid" borderColor="cyber.500">
                              <Badge
                                colorScheme={battle.status === 'completed' ? 'green' : 'yellow'}
                                fontFamily="body"
                                px={3}
                                py={1}
                              >
                                {battle.status.toUpperCase()}
                              </Badge>
                              {battle.winner_username && (
                                <Text fontSize="sm" color="neon.green" fontFamily="body">
                                  Winner: {battle.winner_username}
                                </Text>
                              )}
                              {battle.bits_reward && (
                                <Badge colorScheme="green" fontFamily="body">
                                  +{battle.bits_reward} BITS
                                </Badge>
                              )}
                            </HStack>
                            {battle.status === 'pending' && (
                              <Button
                                variant="cyber"
                                onClick={() => handleCompleteBattle(battle.id)}
                                fontFamily="heading"
                              >
                                RESOLVE BATTLE
                              </Button>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}

                {/* Leaderboard */}
                {leaderboard.length > 0 && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Heading as="h3" size="md" fontFamily="heading" color="neon.green">
                          RANKED LEADERBOARD
                        </Heading>
                        <Box overflowX="auto">
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>Rank</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>Player</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>Rating</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>Tier</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>W/L</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#00ff88', fontFamily: 'Orbitron' }}>Streak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {leaderboard.map((entry, idx) => {
                                const getTierBadge = (tier: string) => {
                                  const tierColors: Record<string, string> = {
                                    Mythic: 'yellow',
                                    Diamond: 'cyan',
                                    Platinum: 'purple',
                                    Gold: 'yellow',
                                    Silver: 'gray',
                                    Bronze: 'orange',
                                  };
                                  const tierIcons: Record<string, string> = {
                                    Mythic: '⭐',
                                    Diamond: '💎',
                                    Platinum: '🔮',
                                    Gold: '🏆',
                                    Silver: '🥈',
                                    Bronze: '🥉',
                                  };
                                  return (
                                    <Badge
                                      colorScheme={tierColors[tier] || 'purple'}
                                      fontSize="xs"
                                      fontFamily="body"
                                    >
                                      {tierIcons[tier] || ''} {entry.tier}
                                    </Badge>
                                  );
                                };
                                return (
                                  <tr key={entry.userId} style={{ borderTop: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', color: 'gray.300' }}>#{idx + 1}</td>
                                    <td style={{ padding: '12px', fontFamily: 'body', color: 'gray.300' }}>
                                      <HStack spacing={2}>
                                        <Text>{entry.username}</Text>
                                        {idx < 10 && (
                                          <Badge colorScheme="purple" fontSize="xs">TOP 10</Badge>
                                        )}
                                        {idx === 0 && (
                                          <Badge colorScheme="yellow" fontSize="xs">👑 #1</Badge>
                                        )}
                                      </HStack>
                                    </td>
                                    <td style={{ padding: '12px', fontFamily: 'heading', color: 'neon.cyan' }}>{entry.rating}</td>
                                    <td style={{ padding: '12px' }}>
                                      {getTierBadge(entry.tier)}
                                    </td>
                                    <td style={{ padding: '12px', fontFamily: 'body', color: 'gray.300' }}>
                                      {entry.wins}W / {entry.losses}L
                                    </td>
                                    <td style={{ padding: '12px', fontFamily: 'heading', color: entry.streak > 0 ? 'neon.green' : 'red.400' }}>
                                      {entry.streak > 0 ? '+' : ''}{entry.streak}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Start Battle Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            START NEW BATTLE
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <FormControl>
                <FormLabel color="gray.300" fontFamily="body">Your NFT (Attacker)</FormLabel>
                <Select
                  value={attackerNFTId}
                  onChange={(e) => setAttackerNFTId(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  placeholder="Select your NFT"
                >
                  {myNFTs.map((nft) => (
                    <option key={nft.id} value={nft.id}>
                      {nft.name} (Power: {nft.battle_power}, Level: {nft.level})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel color="gray.300" fontFamily="body">Opponent NFT (Defender)</FormLabel>
                <Select
                  value={defenderNFTId}
                  onChange={(e) => setDefenderNFTId(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  placeholder="Select opponent NFT"
                >
                  {allNFTs.filter(nft => nft.id.toString() !== attackerNFTId).map((nft) => (
                    <option key={nft.id} value={nft.id}>
                      {nft.name} (Power: {nft.battle_power}, Level: {nft.level})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="cyber"
                onClick={handleStartBattle}
                w="100%"
                fontFamily="heading"
                isDisabled={!attackerNFTId || !defenderNFTId}
              >
                INITIATE BATTLE
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Heroic Battle Modal */}
      <Modal isOpen={isHeroicOpen} onClose={onHeroicClose}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            HEROIC DUEL
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Box p={4} bg="rgba(139, 92, 246, 0.1)" borderRadius="md" border="1px solid" borderColor="purple.500">
                <Text color="gray.300" fontFamily="body" mb={2}>
                  <strong>Your Heroic DNFT:</strong> {hero?.name}
                </Text>
                <Text fontSize="sm" color="gray.400" fontFamily="body">
                  Heroic battles earn 25% bonus XP and Bits!
                </Text>
              </Box>
              <FormControl>
                <FormLabel color="gray.300" fontFamily="body">Opponent NFT (Defender)</FormLabel>
                <Select
                  value={defenderNFTId}
                  onChange={(e) => setDefenderNFTId(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  placeholder="Select opponent NFT"
                >
                  {allNFTs.filter(nft => nft.id !== hero?.id).map((nft) => (
                    <option key={nft.id} value={nft.id}>
                      {nft.name} (Power: {nft.battle_power}, Level: {nft.level})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="neon"
                onClick={() => {
                  setBattleType('heroic');
                  setIsRankedBattle(false);
                  handleStartBattle();
                }}
                w="100%"
                fontFamily="heading"
                isDisabled={!defenderNFTId}
              >
                INITIATE HEROIC BATTLE
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Ranked Heroic Battle Modal */}
      <Modal isOpen={isRankedOpen} onClose={onRankedClose} size="lg">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            START RANKED HEROIC BATTLE
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              {hero && (
                <Box w="100%" p={4} bg="rgba(139, 92, 246, 0.1)" borderRadius="md" border="1px solid" borderColor="purple.500">
                  <Text fontFamily="heading" color="neon.cyan" mb={2}>
                    Your Heroic DNFT: {hero.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400" fontFamily="body">
                    Ranked battles affect your rating and tier. Win to climb the ladder!
                  </Text>
                </Box>
              )}
              {season && (
                <Box w="100%" p={3} bg="rgba(0, 255, 136, 0.1)" borderRadius="md">
                  <Text fontSize="sm" color="neon.green" fontFamily="body">
                    Active Season: {season.name}
                  </Text>
                </Box>
              )}
              <FormControl>
                <FormLabel color="gray.300" fontFamily="body">Opponent NFT (Defender)</FormLabel>
                <Select
                  value={defenderNFTId}
                  onChange={(e) => setDefenderNFTId(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                >
                  <option value="">Select opponent NFT</option>
                  {allNFTs
                    .filter((nft) => nft.owner_id !== user?.id && (!hero || nft.id !== hero.id))
                    .map((nft) => (
                      <option key={nft.id} value={nft.id}>
                        {nft.name} (Power: {nft.battle_power || 0})
                      </option>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="neon"
                onClick={() => {
                  setBattleType('heroic');
                  setIsRankedBattle(true);
                  handleStartBattle();
                  setIsRankedBattle(false);
                  onRankedClose();
                }}
                w="100%"
                fontFamily="heading"
                isDisabled={!defenderNFTId || !hero || !season}
              >
                INITIATE RANKED HEROIC BATTLE
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Battle Result Modal */}
      <Modal isOpen={isResultOpen} onClose={onResultClose} size="xl" scrollBehavior="inside">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            BATTLE RESULT
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {battleResult && (
              <VStack spacing={6} align="stretch">
                <Box textAlign="center" p={4} bg="rgba(0, 255, 136, 0.1)" borderRadius="md" border="1px solid" borderColor="neon.green">
                  <Text fontFamily="heading" fontSize="xl" color="neon.green" mb={2}>
                    Winner: NFT #{battleResult.winnerNftId}
                  </Text>
                  <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                    +{battleResult.bitsReward} BITS
                  </Badge>
                </Box>

                <Box>
                  <Heading as="h3" size="md" fontFamily="heading" color="neon.cyan" mb={4}>
                    BATTLE LOG
                  </Heading>
                  <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                    {battleResult.turns.map((turn, idx) => {
                      const isAttackerTurn = turn.actingNftId === battleResult.attacker.nftId;
                      const targetName = isAttackerTurn ? 'Defender' : 'Attacker';
                      const effectivenessText = getEffectivenessText(turn.effectiveness);
                      
                      return (
                        <Box
                          key={idx}
                          p={3}
                          bg="rgba(139, 92, 246, 0.1)"
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor={isAttackerTurn ? 'neon.green' : 'neon.pink'}
                        >
                          <HStack justify="space-between" flexWrap="wrap">
                            <VStack align="start" spacing={1}>
                              <Text fontFamily="body" fontSize="sm" color="gray.300">
                                <strong>Turn {turn.turnNumber}</strong>
                              </Text>
                              <Text fontFamily="body" fontSize="sm" color={isAttackerTurn ? 'neon.green' : 'neon.pink'}>
                                {isAttackerTurn ? 'Attacker' : 'Defender'} used <strong>{turn.moveName || 'Move'}</strong>
                              </Text>
                              {turn.damageDone > 0 ? (
                                <HStack spacing={2}>
                                  <Text fontFamily="body" fontSize="sm" color="gray.300">
                                    → {turn.damageDone} damage
                                  </Text>
                                  {turn.crit && (
                                    <Badge colorScheme="red" fontSize="xs">CRIT!</Badge>
                                  )}
                                  {effectivenessText && (
                                    <Text fontFamily="body" fontSize="xs" color={getEffectivenessColor(turn.effectiveness)}>
                                      {effectivenessText}
                                    </Text>
                                  )}
                                </HStack>
                              ) : (
                                <Text fontFamily="body" fontSize="xs" color="gray.500">
                                  Missed!
                                </Text>
                              )}
                            </VStack>
                            <VStack align="end" spacing={1}>
                              <Text fontFamily="mono" fontSize="xs" color="gray.400">
                                Attacker HP: {turn.attackerHpAfter}
                              </Text>
                              <Text fontFamily="mono" fontSize="xs" color="gray.400">
                                Defender HP: {turn.defenderHpAfter}
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>

                <Box pt={4} borderTop="1px solid" borderColor="cyber.500">
                  <Heading as="h3" size="md" fontFamily="heading" color="neon.cyan" mb={4}>
                    FINAL STATS
                  </Heading>
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontFamily="body" fontSize="sm" color="gray.400" mb={2}>Attacker</Text>
                      <VStack align="start" spacing={1} fontSize="xs" fontFamily="mono" color="gray.300">
                        <Text>Level: {battleResult.attacker.level}</Text>
                        <Text>XP: {battleResult.attacker.experience}</Text>
                        <Text>HP: {battleResult.attacker.hp}</Text>
                        <Text>ATK: {battleResult.attacker.attack}</Text>
                        <Text>DEF: {battleResult.attacker.defense}</Text>
                        <Text>SPD: {battleResult.attacker.speed}</Text>
                        <Text>Type: {battleResult.attacker.affinity}</Text>
                      </VStack>
                    </Box>
                    <Box>
                      <Text fontFamily="body" fontSize="sm" color="gray.400" mb={2}>Defender</Text>
                      <VStack align="start" spacing={1} fontSize="xs" fontFamily="mono" color="gray.300">
                        <Text>Level: {battleResult.defender.level}</Text>
                        <Text>XP: {battleResult.defender.experience}</Text>
                        <Text>HP: {battleResult.defender.hp}</Text>
                        <Text>ATK: {battleResult.defender.attack}</Text>
                        <Text>DEF: {battleResult.defender.defense}</Text>
                        <Text>SPD: {battleResult.defender.speed}</Text>
                        <Text>Type: {battleResult.defender.affinity}</Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
