'use client';

import { useState, useEffect } from 'react';
import { HStack, Button, Box, Text, Badge, useToast, Avatar, Tooltip, VStack, useDisclosure, Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton, IconButton } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useHeroStore } from '@/store/heroStore';
import { useRouter } from 'next/navigation';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { shortenAddress, resolveEnsName } from '@/utils/addressDisplay';
import { DEMIURGE_CHAIN } from '@/config/web3Config';
import { isWalletAvailable } from '@/utils/web3Provider';

export default function Navbar() {
  const { user, logout, walletLoginOrLink } = useAuthStore();
  const { hero, loadHero } = useHeroStore();
  const router = useRouter();
  const toast = useToast();
  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  
  const { address, isCorrectNetwork, isConnecting: isWalletConnecting, connectWallet, ensureDemiurgeNetwork } = useWalletConnection();
  const [ensName, setEnsName] = useState<string | null>(null);
  const [walletAvailable, setWalletAvailable] = useState(false);

  // Check wallet availability only on client side to avoid hydration mismatch
  useEffect(() => {
    setWalletAvailable(isWalletAvailable());
  }, []);

  // Load hero when user is logged in
  useEffect(() => {
    if (user) {
      loadHero();
    }
  }, [user]);

  // Resolve ENS name for connected wallet address
  useEffect(() => {
    let cancelled = false;
    async function fetchEns() {
      if (!address) {
        setEnsName(null);
        return;
      }
      const name = await resolveEnsName(address);
      if (!cancelled) setEnsName(name);
    }
    fetchEns();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleWalletConnect = async () => {
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
      // After connecting wallet, trigger auth flow
      const hadWalletBefore = !!user?.walletAddress;
      await walletLoginOrLink();
      toast({
        title: hadWalletBefore ? 'Wallet Linked!' : 'Wallet Connected!',
        description: hadWalletBefore
          ? 'Your wallet has been linked to your account.'
          : 'Successfully signed in with your wallet.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Wallet Connection Failed',
        description: error.message || 'Failed to connect wallet. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await ensureDemiurgeNetwork();
      toast({
        title: 'Network Switched',
        description: `Switched to ${DEMIURGE_CHAIN.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Could not switch network. Please check your wallet settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const displayName = user?.username ?? ensName ?? (address ? shortenAddress(address) : null);
  const networkLabel = isCorrectNetwork ? DEMIURGE_CHAIN.name : 'Wrong Network';

  const NavLinks = () => (
    <>
      <Link href="/gallery" style={{ textDecoration: 'none' }}>
        <Text
          cursor="pointer"
          color="gray.300"
          _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
          transition="all 0.3s"
          onClick={onMobileMenuClose}
        >
          GALLERY
        </Text>
      </Link>
      <Link href="/marketplace" style={{ textDecoration: 'none' }}>
        <Text
          cursor="pointer"
          color="gray.300"
          _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
          transition="all 0.3s"
          onClick={onMobileMenuClose}
        >
          MARKETPLACE
        </Text>
      </Link>
      <Link href="/battles" style={{ textDecoration: 'none' }}>
        <Text
          cursor="pointer"
          color="gray.300"
          _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
          transition="all 0.3s"
          onClick={onMobileMenuClose}
        >
          BATTLES
        </Text>
      </Link>
      <Link href="/chat" style={{ textDecoration: 'none' }}>
        <Text
          cursor="pointer"
          color="gray.300"
          _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
          transition="all 0.3s"
          onClick={onMobileMenuClose}
        >
          CHAT
        </Text>
      </Link>
      <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
        <Text
          cursor="pointer"
          color="gray.300"
          _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
          transition="all 0.3s"
          onClick={onMobileMenuClose}
        >
          LEADERBOARD
        </Text>
      </Link>
      {user && (
        <Link href="/create" style={{ textDecoration: 'none' }}>
          <Text
            cursor="pointer"
            color="gray.300"
            _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
            transition="all 0.3s"
            onClick={onMobileMenuClose}
          >
            CREATE
          </Text>
        </Link>
      )}
    </>
  );

  return (
    <>
      <Box
        bg="rgba(10, 10, 15, 0.95)"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="cyber.500"
        py={4}
        px={{ base: 4, md: 8 }}
        position="sticky"
        top={0}
        zIndex={1000}
        boxShadow="0 0 20px rgba(139, 92, 246, 0.3)"
      >
        <HStack justify="space-between">
          <HStack spacing={{ base: 4, md: 8 }}>
            <Link href="/">
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                fontWeight="bold"
                cursor="pointer"
                fontFamily="heading"
                bgGradient="linear(to-r, #8b5cf6, #ec4899)"
                bgClip="text"
                _hover={{
                  textShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
                }}
              >
                ⚡ DEMIURGE
              </Text>
            </Link>
            <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
              <NavLinks />
            </HStack>
          </HStack>
          <HStack spacing={2}>
            {/* Network Badge */}
            {address && (
              <Badge
                colorScheme={isCorrectNetwork ? 'green' : 'red'}
                fontSize="xs"
                px={2}
                py={1}
                display={{ base: 'none', md: 'flex' }}
              >
                {networkLabel}
              </Badge>
            )}
            {/* Wrong Network Warning & Switch Button */}
            {address && !isCorrectNetwork && (
              <Button
                variant="outline"
                size="xs"
                onClick={handleSwitchNetwork}
                borderColor="red.400"
                color="red.400"
                _hover={{ bg: 'rgba(248, 113, 113, 0.1)' }}
                display={{ base: 'none', md: 'flex' }}
              >
                SWITCH NETWORK
              </Button>
            )}
            {/* Desktop Wallet/User Section */}
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
              {user ? (
                <>
                  <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
                    {user.bits} BITS
                  </Badge>
                  {(address || user.walletAddress) && (
                    <Badge
                      colorScheme="green"
                      fontSize="xs"
                      px={2}
                      py={1}
                      fontFamily="mono"
                      bg="rgba(0, 255, 136, 0.1)"
                      borderColor="neon.green"
                      borderWidth="1px"
                      maxW="150px"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      title={address || user.walletAddress || ''}
                    >
                      {displayName || shortenAddress(address || user.walletAddress || '')}
                    </Badge>
                  )}
                  {!address && !user.walletAddress && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWalletConnect}
                      isLoading={isWalletConnecting}
                      borderColor="neon.green"
                      color="neon.green"
                      _hover={{ bg: 'rgba(0, 255, 136, 0.1)' }}
                      fontSize="xs"
                    >
                      LINK WALLET
                    </Button>
                  )}
                  {hero && (
                    <Tooltip label="Heroic DNFT – levels up as you battle" placement="bottom">
                      <Link href="/profile">
                        <Avatar
                          size="sm"
                          name={hero.name}
                          src={hero.mediaUrl}
                          bg={`${hero.affinity}.500`}
                          border="2px solid"
                          borderColor="neon.green"
                          cursor="pointer"
                          _hover={{ borderColor: 'neon.cyan', boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}
                        />
                      </Link>
                    </Tooltip>
                  )}
                  <Link href="/profile">
                    <Button variant="neon" size="sm">
                      {user.username}
                    </Button>
                  </Link>
                  <Button variant="neon" size="sm" onClick={handleLogout}>
                    LOGOUT
                  </Button>
                </>
              ) : (
                <>
                  {walletAvailable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWalletConnect}
                      isLoading={isWalletConnecting}
                      borderColor="neon.green"
                      color="neon.green"
                      _hover={{ bg: 'rgba(0, 255, 136, 0.1)' }}
                    >
                      SIGN IN WITH WALLET
                    </Button>
                  )}
                  <Link href="/auth/login">
                    <Button variant="neon" size="sm">
                      LOGIN
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="cyber" size="sm">
                      SIGN UP
                    </Button>
                  </Link>
                </>
              )}
            </HStack>
            {/* Mobile Menu Button */}
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              color="gray.300"
              display={{ base: 'flex', md: 'none' }}
              onClick={onMobileMenuOpen}
            />
          </HStack>
        </HStack>
      </Box>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isMobileMenuOpen} placement="right" onClose={onMobileMenuClose}>
        <DrawerOverlay />
        <DrawerContent bg="rgba(10, 10, 15, 0.98)" borderLeft="1px solid" borderColor="cyber.500">
          <DrawerCloseButton color="gray.300" />
          <DrawerHeader fontFamily="heading" color="neon.green">MENU</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {/* Network Status (Mobile) */}
              {address && (
                <>
                  <Badge
                    colorScheme={isCorrectNetwork ? 'green' : 'red'}
                    fontSize="sm"
                    px={3}
                    py={2}
                    textAlign="center"
                  >
                    {networkLabel}
                  </Badge>
                  {!isCorrectNetwork && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSwitchNetwork();
                        onMobileMenuClose();
                      }}
                      borderColor="red.400"
                      color="red.400"
                      _hover={{ bg: 'rgba(248, 113, 113, 0.1)' }}
                    >
                      SWITCH TO DEMIURGE NETWORK
                    </Button>
                  )}
                </>
              )}
              {/* Mobile Nav Links */}
              <VStack spacing={4} align="stretch">
                <NavLinks />
              </VStack>
              {/* Mobile User Section */}
              {user ? (
                <VStack spacing={3} align="stretch" pt={4} borderTop="1px solid" borderColor="cyber.500">
                  <Badge colorScheme="purple" fontSize="sm" px={3} py={2} textAlign="center">
                    {user.bits} BITS
                  </Badge>
                  {(address || user.walletAddress) && (
                    <Badge
                      colorScheme="green"
                      fontSize="sm"
                      px={3}
                      py={2}
                      fontFamily="mono"
                      textAlign="center"
                      bg="rgba(0, 255, 136, 0.1)"
                      borderColor="neon.green"
                      borderWidth="1px"
                    >
                      {displayName || shortenAddress(address || user.walletAddress || '')}
                    </Badge>
                  )}
                  {hero && (
                    <HStack justify="center" spacing={2}>
                      <Avatar
                        size="md"
                        name={hero.name}
                        src={hero.mediaUrl}
                        bg={`${hero.affinity}.500`}
                        border="2px solid"
                        borderColor="neon.green"
                      />
                      <Text fontFamily="heading" color="neon.green">{hero.name}</Text>
                    </HStack>
                  )}
                  <Link href="/profile" style={{ width: '100%' }}>
                    <Button variant="neon" w="100%" onClick={onMobileMenuClose}>
                      PROFILE
                    </Button>
                  </Link>
                  <Button variant="neon" onClick={() => { handleLogout(); onMobileMenuClose(); }}>
                    LOGOUT
                  </Button>
                </VStack>
              ) : (
                <VStack spacing={3} align="stretch" pt={4} borderTop="1px solid" borderColor="cyber.500">
                  {walletAvailable && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleWalletConnect();
                        onMobileMenuClose();
                      }}
                      isLoading={isWalletConnecting}
                      borderColor="neon.green"
                      color="neon.green"
                      _hover={{ bg: 'rgba(0, 255, 136, 0.1)' }}
                    >
                      SIGN IN WITH WALLET
                    </Button>
                  )}
                  <Link href="/auth/login" style={{ width: '100%' }}>
                    <Button variant="neon" w="100%" onClick={onMobileMenuClose}>
                      LOGIN
                    </Button>
                  </Link>
                  <Link href="/auth/register" style={{ width: '100%' }}>
                    <Button variant="cyber" w="100%" onClick={onMobileMenuClose}>
                      SIGN UP
                    </Button>
                  </Link>
                </VStack>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

