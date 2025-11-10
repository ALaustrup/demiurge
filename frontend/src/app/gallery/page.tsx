'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  Image,
  Text,
  VStack,
  Spinner,
  Button,
  Input,
  HStack,
  Select,
  Badge,
  IconButton,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface NFT {
  id: number;
  name: string;
  description: string;
  media_url: string;
  media_type: string;
  owner_username: string;
  creator_username: string;
  battle_power: number;
  level: number;
  created_at?: string;
}

export default function GalleryPage() {
  const { user } = useAuthStore();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNFTs, setFilteredNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isListOpen, onOpen: onListOpen, onClose: onListClose } = useDisclosure();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [listingNFT, setListingNFT] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchNFTs();
  }, []);

  useEffect(() => {
    filterAndSortNFTs();
  }, [nfts, searchQuery, sortBy, filterType]);

  const fetchNFTs = async () => {
    try {
      const response = await api.get('/nft/gallery?limit=100');
      setNfts(response.data.nfts);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortNFTs = () => {
    let filtered = [...nfts];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (nft) =>
          nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          nft.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((nft) => nft.media_type === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return b.id - a.id;
        case 'oldest':
          if (a.created_at && b.created_at) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return a.id - b.id;
        case 'power':
          return b.battle_power - a.battle_power;
        case 'level':
          return b.level - a.level;
        default:
          return 0;
      }
    });

    setFilteredNFTs(filtered);
  };

  const handleNFTClick = (nft: NFT) => {
    setSelectedNFT(nft);
    onOpen();
  };

  const handleListForSale = async () => {
    if (!selectedNFT || !listPrice) {
      toast({
        title: 'Enter Price',
        description: 'Please enter a price for your NFT',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setListingNFT(true);
    try {
      await api.post('/marketplace/list', {
        nftId: selectedNFT.id,
        price: parseFloat(listPrice),
      });
      toast({
        title: 'NFT Listed!',
        description: 'Your NFT is now available on the marketplace',
        status: 'success',
        duration: 3000,
      });
      onListClose();
      onClose();
      setListPrice('');
    } catch (error: any) {
      toast({
        title: 'Listing Failed',
        description: error.response?.data?.message || 'Failed to list NFT',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setListingNFT(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading gallery...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between" align="flex-end">
          <Box>
            <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
              NFT GALLERY
            </Heading>
            <Text color="gray.400" mt={2} fontFamily="body">
              Explore {filteredNFTs.length} digital masterpieces
            </Text>
          </Box>
          {user && (
            <Link href="/create">
              <Button variant="cyber" fontFamily="heading">
                CREATE NFT
              </Button>
            </Link>
          )}
        </HStack>

        {/* Filters */}
        <Card>
          <CardBody>
            <HStack spacing={4} flexWrap="wrap">
              <InputGroup flex="1" minW="200px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search NFTs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                />
              </InputGroup>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                w="150px"
                bg="rgba(26, 26, 46, 0.8)"
                borderColor="cyber.500"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </Select>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                w="150px"
                bg="rgba(26, 26, 46, 0.8)"
                borderColor="cyber.500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="power">Battle Power</option>
                <option value="level">Level</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {loading ? (
          <VStack spacing={4} py={20}>
            <Spinner size="xl" color="neon.green" />
            <Text color="gray.400">Loading gallery...</Text>
          </VStack>
        ) : filteredNFTs.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="xl" color="gray.400" mb={4}>
              No NFTs found
            </Text>
            {user && (
              <Link href="/create">
                <Button variant="cyber">Create Your First NFT</Button>
              </Link>
            )}
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
            {filteredNFTs.map((nft) => (
              <Card
                key={nft.id}
                cursor="pointer"
                _hover={{
                  transform: 'translateY(-5px)',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
                }}
                transition="all 0.3s"
                onClick={() => handleNFTClick(nft)}
              >
                <Box
                  h="250px"
                  bg="rgba(26, 26, 46, 0.5)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                  position="relative"
                >
                  {nft.media_type === 'image' ? (
                    <Image
                      src={nft.media_url}
                      alt={nft.name}
                      maxH="100%"
                      maxW="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <VStack>
                      <Text fontSize="4xl">
                        {nft.media_type === 'video' ? '🎬' : '🎵'}
                      </Text>
                      <Text color="gray.400" fontSize="sm" fontFamily="body">
                        {nft.media_type.toUpperCase()}
                      </Text>
                    </VStack>
                  )}
                  <Badge
                    position="absolute"
                    top={2}
                    right={2}
                    colorScheme="purple"
                    fontFamily="body"
                  >
                    Lv.{nft.level}
                  </Badge>
                </Box>
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <Heading as="h3" size="md" fontFamily="heading" color="neon.green" noOfLines={1}>
                      {nft.name}
                    </Heading>
                    <Text fontSize="sm" color="gray.400" noOfLines={2} fontFamily="body">
                      {nft.description}
                    </Text>
                    <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="cyber.500">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color="gray.500" fontFamily="body">
                          Owner
                        </Text>
                        <Text fontSize="sm" color="gray.300" fontFamily="body">
                          {nft.owner_username}
                        </Text>
                      </VStack>
                      <VStack align="end" spacing={0}>
                        <Text fontSize="xs" color="gray.500" fontFamily="body">
                          Power
                        </Text>
                        <Text fontSize="sm" color="neon.cyan" fontFamily="heading">
                          {nft.battle_power}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* NFT Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            {selectedNFT?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedNFT && (
              <VStack spacing={4} align="stretch">
                <Box h="300px" bg="rgba(26, 26, 46, 0.5)" borderRadius="md" overflow="hidden">
                  {selectedNFT.media_type === 'image' ? (
                    <Image src={selectedNFT.media_url} alt={selectedNFT.name} h="100%" w="100%" objectFit="cover" />
                  ) : (
                    <VStack h="100%" justify="center">
                      <Text fontSize="6xl">{selectedNFT.media_type === 'video' ? '🎬' : '🎵'}</Text>
                    </VStack>
                  )}
                </Box>
                <Text color="gray.300" fontFamily="body">{selectedNFT.description}</Text>
                <HStack spacing={4}>
                  <Badge colorScheme="purple" px={3} py={1} fontFamily="body">
                    Level {selectedNFT.level}
                  </Badge>
                  <Badge colorScheme="cyan" px={3} py={1} fontFamily="body">
                    Power: {selectedNFT.battle_power}
                  </Badge>
                  <Badge colorScheme="green" px={3} py={1} fontFamily="body">
                    {selectedNFT.media_type.toUpperCase()}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.400" fontFamily="body">
                  Created by: {selectedNFT.creator_username} | Owned by: {selectedNFT.owner_username}
                </Text>
                {user && selectedNFT.owner_username === user.username && (
                  <>
                    {selectedNFT?.is_heroic || selectedNFT?.is_soulbound ? (
                      <Badge colorScheme="purple" fontSize="sm" px={3} py={1} fontFamily="body" mt={4}>
                        SOULBOUND - NOT TRADABLE
                      </Badge>
                    ) : (
                      <Button
                        variant="cyber"
                        onClick={onListOpen}
                        fontFamily="heading"
                        mt={4}
                      >
                        LIST FOR SALE
                      </Button>
                    )}
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* List for Sale Modal */}
      <Modal isOpen={isListOpen} onClose={onListClose}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
          <ModalHeader fontFamily="heading" color="neon.green">
            LIST NFT FOR SALE
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Text color="gray.300" fontFamily="body">
                {selectedNFT?.name}
              </Text>
              <FormControl>
                <FormLabel color="gray.300" fontFamily="body">Price (Bits)</FormLabel>
                <Input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="Enter price"
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                />
              </FormControl>
              <Button
                variant="cyber"
                onClick={handleListForSale}
                w="100%"
                fontFamily="heading"
                isLoading={listingNFT}
              >
                LIST ON MARKETPLACE
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}

