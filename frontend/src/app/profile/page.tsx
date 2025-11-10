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
import api from '@/utils/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchProfile();
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

  const handleLogout = () => {
    logout();
    router.push('/');
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
                <Text color="gray.400" fontFamily="body">{profile.email}</Text>
                <Text fontSize="sm" color="gray.500" mt={2} fontFamily="body">
                  Wallet: {profile.walletAddress}
                </Text>
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
      </VStack>
    </Container>
  );
}

