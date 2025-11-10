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
} from '@chakra-ui/react';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

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
}

interface NFT {
  id: number;
  name: string;
  battle_power: number;
  level: number;
}

export default function BattlesPage() {
  const { user } = useAuthStore();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [allNFTs, setAllNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [attackerNFTId, setAttackerNFTId] = useState('');
  const [defenderNFTId, setDefenderNFTId] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchBattles();
      fetchMyNFTs();
      fetchAllNFTs();
    }
  }, [user]);

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
    if (!attackerNFTId || !defenderNFTId) {
      toast({
        title: 'Select NFTs',
        description: 'Please select both attacker and defender NFTs',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      await api.post('/battle', {
        attackerNFTId: parseInt(attackerNFTId),
        defenderNFTId: parseInt(defenderNFTId),
      });
      toast({
        title: 'Battle Started!',
        description: 'Your battle has been initiated',
        status: 'success',
        duration: 3000,
      });
      onClose();
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
      await api.post(`/battle/${battleId}/complete`);
      toast({
        title: 'Battle Completed!',
        status: 'success',
        duration: 3000,
      });
      fetchBattles();
    } catch (error) {
      console.error('Error completing battle:', error);
    }
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
          <Button variant="cyber" onClick={onOpen} fontFamily="heading">
            START BATTLE
          </Button>
        </HStack>

        {battles.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="xl" color="gray.400" mb={4}>
              No battles yet. Start your first battle!
            </Text>
            <Button variant="cyber" onClick={onOpen} fontFamily="heading">
              START BATTLE
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {battles.map((battle) => (
              <Card key={battle.id} _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={2}>
                        <Text fontFamily="heading" fontSize="lg" color="neon.green">
                          {battle.attacker_nft_name}
                        </Text>
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
                        COMPLETE BATTLE
                      </Button>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
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
    </Container>
  );
}
