'use client';

import { Box, Container, Heading, Text, Button, VStack, HStack, Stat, StatLabel, StatNumber, SimpleGrid, Card, CardBody, useToast } from '@chakra-ui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { isWalletAvailable } from '@/utils/web3Provider';

export default function Home() {
  const { user, walletLoginOrLink } = useAuthStore();
  const { address, isCorrectNetwork, connectWallet, ensureDemiurgeNetwork } = useWalletConnection();
  const [stats, setStats] = useState({ nfts: 0, users: 0, battles: 0, listings: 0 });
  const [walletAvailable, setWalletAvailable] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setWalletAvailable(isWalletAvailable());
    fetchStats();
  }, []);

  const handleConnectWallet = async () => {
    if (!isWalletAvailable()) {
      toast({
        title: 'No Wallet Detected',
        description: 'Please install MetaMask or open this site in your wallet app.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      await connectWallet();
      if (!isCorrectNetwork) {
        await ensureDemiurgeNetwork();
      }
      await walletLoginOrLink();
      toast({
        title: 'Welcome to Demiurge!',
        description: 'Successfully connected your wallet.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchStats = async () => {
    try {
      const [nfts, users, battles, listings] = await Promise.all([
        api.get('/nft/gallery?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
        api.get('/user/leaderboard?limit=1').catch(() => ({ data: { leaderboard: [] } })),
        api.get('/battle/my').catch(() => ({ data: { battles: [] } })),
        api.get('/marketplace/listings?limit=1').catch(() => ({ data: { pagination: { total: 0 } } }))
      ]);
      
      setStats({
        nfts: nfts.data.pagination?.total || 0,
        users: users.data.leaderboard?.length || 0,
        battles: battles.data.battles?.length || 0,
        listings: listings.data.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <Box minH="100vh" position="relative" overflow="hidden">
      {/* Animated background effects */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="radial(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial(circle at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)"
        pointerEvents="none"
      />
      
      <Container maxW="container.xl" py={20} position="relative" zIndex={1}>
        <VStack spacing={16} align="stretch">
          {/* Hero Section */}
          <Box textAlign="center" py={20}>
            <Heading
              as="h1"
              size="4xl"
              mb={6}
              fontFamily="heading"
              bgGradient="linear(to-r, #8b5cf6, #ec4899, #06b6d4)"
              bgClip="text"
              textShadow="0 0 30px rgba(139, 92, 246, 0.5)"
            >
              ⚡ DEMIURGE
            </Heading>
            <Text fontSize="2xl" color="gray.300" mb={4} fontFamily="body">
              THE ULTIMATE NFT BATTLE ARENA
            </Text>
            <Text fontSize="lg" color="gray.400" mb={12} maxW="2xl" mx="auto">
              Create, trade, and battle with NFTs in the cyberpunk metaverse. 
              Earn Bits, level up your collection, and dominate the leaderboard.
            </Text>
            {!user ? (
              <VStack spacing={4}>
                {walletAvailable && (
                  <Button
                    variant="neon"
                    size="lg"
                    px={12}
                    py={8}
                    fontSize="xl"
                    onClick={handleConnectWallet}
                    _hover={{ transform: 'scale(1.05)', boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)' }}
                    transition="all 0.3s"
                  >
                    🔗 CONNECT WALLET
                  </Button>
                )}
                <HStack spacing={6} justify="center" flexWrap="wrap">
                  <Link href="/auth/register">
                    <Button variant="cyber" size="lg" px={8}>
                      SIGN UP WITH EMAIL
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button variant="outline" size="lg" px={8} borderColor="neon.green" color="neon.green" _hover={{ bg: 'rgba(0, 255, 136, 0.1)' }}>
                      LOGIN
                    </Button>
                  </Link>
                </HStack>
                {!walletAvailable && (
                  <Text fontSize="sm" color="gray.500" fontFamily="body" mt={4}>
                    No wallet detected. Install MetaMask or open in a wallet browser.
                  </Text>
                )}
              </VStack>
            ) : (
              <HStack spacing={6} justify="center" flexWrap="wrap">
                <Link href="/battles">
                  <Button variant="neon" size="lg" px={8}>
                    START BATTLING
                  </Button>
                </Link>
                <Link href="/gallery">
                  <Button variant="cyber" size="lg" px={8}>
                    EXPLORE GALLERY
                  </Button>
                </Link>
              </HStack>
            )}
          </Box>

          {/* Stats Section */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8} mb={8}>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">TOTAL NFTS</StatLabel>
                  <StatNumber color="neon.green" fontFamily="heading" fontSize="3xl">
                    {stats.nfts.toLocaleString()}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">ACTIVE USERS</StatLabel>
                  <StatNumber color="neon.cyan" fontFamily="heading" fontSize="3xl">
                    {stats.users.toLocaleString()}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">BATTLES FOUGHT</StatLabel>
                  <StatNumber color="neon.pink" fontFamily="heading" fontSize="3xl">
                    {stats.battles.toLocaleString()}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400" fontFamily="body">MARKETPLACE LISTINGS</StatLabel>
                  <StatNumber color="cyber.500" fontFamily="heading" fontSize="3xl">
                    {stats.listings.toLocaleString()}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Features Section */}
          <Box>
            <Heading as="h2" size="2xl" mb={8} textAlign="center" fontFamily="heading" color="neon.green">
              CORE FEATURES
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <Heading as="h3" size="lg" mb={3} fontFamily="heading" color="neon.green">
                    ⚡ CREATE & MINT NFTS
                  </Heading>
                  <Text color="gray.300" fontFamily="body">
                    Create unique NFTs with smart contracts and store them on IPFS. 
                    Each NFT has battle power and can level up through victories.
                  </Text>
                </CardBody>
              </Card>
              <Card _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <Heading as="h3" size="lg" mb={3} fontFamily="heading" color="neon.cyan">
                    💰 DECENTRALIZED MARKETPLACE
                  </Heading>
                  <Text color="gray.300" fontFamily="body">
                    Buy and sell NFTs in our blockchain-powered marketplace. 
                    Trade with confidence using smart contracts.
                  </Text>
                </CardBody>
              </Card>
              <Card _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <Heading as="h3" size="lg" mb={3} fontFamily="heading" color="neon.pink">
                    ⚔️ NFT WARS
                  </Heading>
                  <Text color="gray.300" fontFamily="body">
                    Battle your NFTs against others in epic combat. 
                    Win battles to earn Bits and increase your social score.
                  </Text>
                </CardBody>
              </Card>
              <Card _hover={{ transform: 'translateY(-5px)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }} transition="all 0.3s">
                <CardBody>
                  <Heading as="h3" size="lg" mb={3} fontFamily="heading" color="cyber.500">
                    💬 REAL-TIME CHAT
                  </Heading>
                  <Text color="gray.300" fontFamily="body">
                    Chat with other users privately or in global channels. 
                    Connect with the community and form alliances.
                  </Text>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

