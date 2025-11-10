'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  VStack,
  Card,
  CardBody,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Button,
  Spinner,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { useAuthStore } from '@/store/authStore';
import { useHeroStore } from '@/store/heroStore';
import api from '@/utils/api';
import { getMyVaultUsage, VaultUsageResponse } from '@/utils/userApi';
import { getMyHeroicRanking } from '@/utils/ladderApi';
import { useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure, Progress } from '@chakra-ui/react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { hero, loading: heroLoading, loadHero, forgeHero, regenerateHero } = useHeroStore();
  const [profile, setProfile] = useState<any>(null);
  const [vaultUsage, setVaultUsage] = useState<VaultUsageResponse | null>(null);
  const [myRanking, setMyRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const toast = useToast();
  const { isOpen: isRegenOpen, onOpen: onRegenOpen, onClose: onRegenClose } = useDisclosure();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchProfile();
    loadHero();
    fetchVaultUsage();
    fetchMyRanking();
  }, [user, router]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/user/${user.id}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaultUsage = async () => {
    try {
      const usage = await getMyVaultUsage();
      setVaultUsage(usage);
    } catch (error) {
      console.error('Error fetching vault usage:', error);
    }
  };

  const fetchMyRanking = async () => {
    try {
      const data = await getMyHeroicRanking();
      setMyRanking(data.ranking);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleForgeHero = async () => {
    setForging(true);
    try {
      await forgeHero();
      toast({
        title: 'Heroic Forged!',
        description: 'Your Heroic DNFT has been created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Forging Failed',
        description: error.response?.data?.message || 'Failed to forge hero',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setForging(false);
    }
  };

  const handleRegenerateHero = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateHero();
      // Update user bits in auth store
      if (user) {
        updateUser({ bits: user.bits - result.bitsSpent });
      }
      // Reload profile to get updated regen counts
      await fetchProfile();
      toast({
        title: 'Hero Regenerated!',
        description: `New Heroic DNFT forged. ${result.bitsSpent} Bits spent.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onRegenClose();
    } catch (error: any) {
      toast({
        title: 'Regeneration Failed',
        description: error.response?.data?.message || 'Failed to regenerate hero',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getAffinityColor = (affinity: string) => {
    const colors: { [key: string]: string } = {
      fire: 'red',
      water: 'blue',
      bio: 'green',
      tech: 'cyan',
      void: 'purple',
      neutral: 'gray',
    };
    return colors[affinity] || 'gray';
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading profile...</Text>
        </VStack>
      </Container>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      bronze: 'orange',
      silver: 'gray',
      gold: 'yellow',
      platinum: 'blue',
      diamond: 'purple',
    };
    return colors[tier] || 'gray';
  };

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
              PROFILE
            </Heading>
            <Text color="gray.400" mt={2} fontFamily="body">
              Your Demiurge identity
            </Text>
          </Box>
          <Button variant="neon" onClick={handleLogout} fontFamily="heading">
            LOGOUT
          </Button>
        </HStack>

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <HStack spacing={4} mb={2}>
                  <Text fontSize="2xl" fontWeight="bold" fontFamily="heading" color="neon.green">
                    {profile.username}
                  </Text>
                  <Badge colorScheme={getTierColor(profile.socialTier)} fontSize="md" px={3} py={1} fontFamily="body">
                    {profile.socialTier.toUpperCase()}
                  </Badge>
                </HStack>
                {profile.email && (
                  <Text color="gray.400" fontFamily="body">{profile.email}</Text>
                )}
                {profile.walletAddress && (
                  <HStack mt={2} spacing={2} flexWrap="wrap">
                    <Text fontSize="sm" color="gray.400" fontFamily="body">
                      Wallet:
                    </Text>
                    <Badge
                      colorScheme="green"
                      fontSize="xs"
                      px={2}
                      py={1}
                      fontFamily="mono"
                      bg="rgba(0, 255, 136, 0.1)"
                      borderColor="neon.green"
                      borderWidth="1px"
                      maxW="100%"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      title={profile.walletAddress}
                    >
                      {profile.walletAddress}
                    </Badge>
                  </HStack>
                )}
              </Box>

              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">BITS</StatLabel>
                  <StatNumber color="neon.green" fontFamily="heading" fontSize="2xl">
                    {profile.bits.toLocaleString()}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">SOCIAL SCORE</StatLabel>
                  <StatNumber color="neon.cyan" fontFamily="heading" fontSize="2xl">
                    {profile.socialScore.toLocaleString()}
                  </StatNumber>
                  <StatHelpText fontFamily="body">Tier: {profile.socialTier}</StatHelpText>
                </Stat>
                {profile.stats && (
                  <>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">NFTS OWNED</StatLabel>
                      <StatNumber color="cyber.500" fontFamily="heading" fontSize="2xl">
                        {profile.stats.nftCount}
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">BATTLES</StatLabel>
                      <StatNumber color="neon.pink" fontFamily="heading" fontSize="2xl">
                        {profile.stats.totalBattles}
                      </StatNumber>
                    </Stat>
                  </>
                )}
              </SimpleGrid>

              {profile.stats && (
                <Box pt={4} borderTop="1px solid" borderColor="cyber.500">
                  <Heading as="h3" size="md" mb={4} fontFamily="heading" color="neon.green">
                    BATTLE STATISTICS
                  </Heading>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">TOTAL BATTLES</StatLabel>
                      <StatNumber color="gray.300" fontFamily="heading">
                        {profile.stats.totalBattles}
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">WINS</StatLabel>
                      <StatNumber color="neon.green" fontFamily="heading">
                        {profile.stats.wins}
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">LOSSES</StatLabel>
                      <StatNumber color="neon.pink" fontFamily="heading">
                        {profile.stats.losses}
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="gray.400" fontFamily="body">WIN RATE</StatLabel>
                      <StatNumber color="neon.cyan" fontFamily="heading">
                        {profile.stats.totalBattles > 0
                          ? ((profile.stats.wins / profile.stats.totalBattles) * 100).toFixed(1)
                          : 0}%
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Storage Vault Section */}
        {vaultUsage && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h2" size="lg" fontFamily="heading" color="neon.green">
                    STORAGE VAULT
                  </Heading>
                  <Badge colorScheme={getTierColor(profile?.socialTier || 'bronze')} fontSize="sm" px={3} py={1} fontFamily="body">
                    {profile?.socialTier?.toUpperCase() || 'BRONZE'} TIER
                  </Badge>
                </HStack>
                {vaultUsage.limit === null ? (
                  <Box>
                    <Text fontSize="xl" fontFamily="heading" color="neon.cyan" mb={2}>
                      {vaultUsage.used} NFTs
                    </Text>
                    <Text fontSize="sm" color="gray.400" fontFamily="body">
                      Unlimited Vault
                    </Text>
                  </Box>
                ) : (
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="xl" fontFamily="heading" color="neon.cyan">
                        {vaultUsage.used} / {vaultUsage.limit} NFTs
                      </Text>
                      <Text fontSize="sm" color="gray.400" fontFamily="body">
                        {Math.round((vaultUsage.used / vaultUsage.limit) * 100)}% used
                      </Text>
                    </HStack>
                    <Progress
                      value={(vaultUsage.used / vaultUsage.limit) * 100}
                      colorScheme={vaultUsage.used >= vaultUsage.limit * 0.9 ? 'red' : vaultUsage.used >= vaultUsage.limit * 0.7 ? 'orange' : 'cyan'}
                      size="lg"
                      borderRadius="md"
                      bg="rgba(26, 26, 46, 0.5)"
                    />
                    {vaultUsage.used >= vaultUsage.limit * 0.9 && (
                      <Text fontSize="xs" color="orange.400" fontFamily="body" mt={2}>
                        ⚠️ Vault nearly full. Win more battles to upgrade your tier!
                      </Text>
                    )}
                  </Box>
                )}
                <Text fontSize="sm" color="gray.500" fontFamily="body" fontStyle="italic">
                  Heroic DNFTs don't count toward vault usage
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Heroic DNFT Section */}
        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack justify="space-between">
                <Heading as="h2" size="lg" fontFamily="heading" color="neon.green">
                  HEROIC DNFT
                </Heading>
                {hero && (
                  <Badge colorScheme="purple" fontSize="sm" px={3} py={1} fontFamily="body">
                    SOULBOUND
                  </Badge>
                )}
              </HStack>

              {heroLoading ? (
                <Box textAlign="center" py={8}>
                  <Spinner size="lg" color="neon.green" />
                  <Text color="gray.400" mt={4} fontFamily="body">Loading hero...</Text>
                </Box>
              ) : hero ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Box>
                    <VStack align="start" spacing={4}>
                      <Box>
                        <Text fontSize="xl" fontWeight="bold" fontFamily="heading" color="neon.cyan" mb={2}>
                          {hero.name}
                        </Text>
                        <Text color="gray.400" fontFamily="body" fontSize="sm">
                          {hero.description}
                        </Text>
                        {hero.heroicUsernameInscription && (
                          <Text color="gray.500" fontFamily="mono" fontSize="xs" mt={2} fontStyle="italic">
                            {hero.heroicUsernameInscription}
                          </Text>
                        )}
                      </Box>
                      <HStack spacing={4} flexWrap="wrap">
                        <Badge colorScheme={getAffinityColor(hero.affinity)} fontSize="md" px={3} py={1} fontFamily="body">
                          {hero.affinity.toUpperCase()}
                        </Badge>
                        <Badge colorScheme="cyan" fontSize="md" px={3} py={1} fontFamily="body">
                          Level {hero.level}
                        </Badge>
                        <Badge colorScheme="green" fontSize="md" px={3} py={1} fontFamily="body">
                          {hero.experience} XP
                        </Badge>
                      </HStack>
                    </VStack>
                  </Box>
                  <Box>
                    <Heading as="h3" size="sm" fontFamily="heading" color="neon.cyan" mb={4}>
                      COMBAT STATS
                    </Heading>
                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel color="gray.400" fontFamily="body">HP</StatLabel>
                        <StatNumber color="red.400" fontFamily="heading">{hero.hp}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel color="gray.400" fontFamily="body">ATTACK</StatLabel>
                        <StatNumber color="orange.400" fontFamily="heading">{hero.attack}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel color="gray.400" fontFamily="body">DEFENSE</StatLabel>
                        <StatNumber color="blue.400" fontFamily="heading">{hero.defense}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel color="gray.400" fontFamily="body">SPEED</StatLabel>
                        <StatNumber color="purple.400" fontFamily="heading">{hero.speed}</StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </Box>
                </SimpleGrid>
              ) : null}

              {hero && (
                <Box pt={4} borderTop="1px solid" borderColor="cyber.500">
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Heading as="h3" size="sm" fontFamily="heading" color="neon.cyan">
                        REGENERATION
                      </Heading>
                      <Text fontSize="sm" color="gray.400" fontFamily="body">
                        {profile?.heroRegenerationsUsed || 0} / {profile?.heroRegenerationsLimit || 5} used
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.400" fontFamily="body">
                      Regenerate your Heroic DNFT to get new stats. Cost: 10,000 Bits
                    </Text>
                    <Button
                      variant="cyber"
                      onClick={onRegenOpen}
                      isDisabled={
                        (profile?.heroRegenerationsUsed || 0) >= (profile?.heroRegenerationsLimit || 5) ||
                        (user?.bits || 0) < 10000
                      }
                      fontFamily="heading"
                    >
                      REGENERATE HEROIC
                    </Button>
                  </VStack>
                </Box>
              )}

              {!hero && (
                <Box textAlign="center" py={8}>
                  <Text fontSize="lg" color="gray.400" mb={4} fontFamily="body">
                    You don't have a Heroic DNFT yet
                  </Text>
                  <Text fontSize="sm" color="gray.500" mb={6} fontFamily="body">
                    Forge your unique Heroic DNFT to use as your avatar and primary battle token
                  </Text>
                  <Button
                    variant="cyber"
                    size="lg"
                    onClick={handleForgeHero}
                    isLoading={forging}
                    fontFamily="heading"
                  >
                    FORGE HEROIC
                  </Button>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Regeneration Confirmation Modal */}
        <Modal isOpen={isRegenOpen} onClose={onRegenClose}>
          <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
          <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
            <ModalHeader fontFamily="heading" color="neon.green">
              REGENERATE HEROIC DNFT
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                <Text color="gray.300" fontFamily="body">
                  This will retire your current Heroic DNFT and forge a new one with fresh stats.
                </Text>
                <Text color="gray.400" fontFamily="body" fontSize="sm">
                  Cost: <strong>10,000 Bits</strong>
                </Text>
                <Text color="gray.400" fontFamily="body" fontSize="sm">
                  Regenerations: {profile?.heroRegenerationsUsed || 0} / {profile?.heroRegenerationsLimit || 5}
                </Text>
                <Text color="red.400" fontFamily="body" fontSize="sm" fontStyle="italic">
                  This action cannot be undone. Your current hero will be retired.
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" mr={3} onClick={onRegenClose} fontFamily="body">
                Cancel
              </Button>
              <Button
                variant="cyber"
                onClick={handleRegenerateHero}
                isLoading={regenerating}
                fontFamily="heading"
              >
                CONFIRM REGENERATION
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Titles & Achievements Section */}
        {myRanking && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h2" size="lg" fontFamily="heading" color="neon.green">
                  TITLES & ACHIEVEMENTS
                </Heading>
                <HStack spacing={4} flexWrap="wrap">
                  <Badge
                    colorScheme="purple"
                    fontSize="lg"
                    px={4}
                    py={2}
                    fontFamily="heading"
                    borderRadius="md"
                    bg="rgba(139, 92, 246, 0.2)"
                    border="1px solid"
                    borderColor="purple.500"
                  >
                    {myRanking.tier}
                  </Badge>
                  {myRanking.tier === 'Mythic' && (
                    <Badge
                      colorScheme="yellow"
                      fontSize="md"
                      px={3}
                      py={1}
                      fontFamily="body"
                    >
                      ⭐ CHAMPION
                    </Badge>
                  )}
                  {myRanking.tier === 'Diamond' && (
                    <Badge
                      colorScheme="cyan"
                      fontSize="md"
                      px={3}
                      py={1}
                      fontFamily="body"
                    >
                      💎 ELITE
                    </Badge>
                  )}
                  {myRanking.tier === 'Gold' && (
                    <Badge
                      colorScheme="yellow"
                      fontSize="md"
                      px={3}
                      py={1}
                      fontFamily="body"
                    >
                      🏆 WARLORD
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color="gray.400" fontFamily="body">
                  Your current ranked tier. Titles are minted on-chain at season end.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Cosmetics Section */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="lg" fontFamily="heading" color="neon.green">
                COSMETICS
              </Heading>
              <Box
                p={8}
                bg="rgba(139, 92, 246, 0.1)"
                borderRadius="md"
                border="1px dashed"
                borderColor="purple.500"
                textAlign="center"
              >
                <Text fontSize="lg" color="gray.400" fontFamily="body" mb={2}>
                  🎨 Cosmetics Coming Soon
                </Text>
                <Text fontSize="sm" color="gray.500" fontFamily="body">
                  Earn cosmetics by ranking high in seasons. View your collection in your wallet.
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}

