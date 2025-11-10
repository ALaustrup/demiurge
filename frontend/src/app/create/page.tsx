'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  VStack,
  Select,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Image,
  Text,
} from '@chakra-ui/react';
import { useAuthStore } from '@/store/authStore';
import api from '@/utils/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@chakra-ui/react';

export default function CreateNFTPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!file || !name || !description) {
      setError('Please fill in all fields and select a file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('mediaType', mediaType);

      await api.post('/nft', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast({
        title: 'NFT Created!',
        description: 'Your NFT has been successfully created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/gallery');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create NFT';
      setError(errorMessage);
      
      // Handle vault limit error specifically
      if (err.response?.status === 403 && err.response?.data?.error === 'VAULT_LIMIT_REACHED') {
        const vaultData = err.response?.data?.data;
        toast({
          title: 'Vault Limit Reached',
          description: `You've filled your free vault (${vaultData?.used || '?'}/${vaultData?.limit || '?'}). Win more battles or reach a higher tier to expand it!`,
          status: 'warning',
          duration: 7000,
          isClosable: true,
        });
        // Set a more detailed error message with link suggestion
        setError(`Vault limit reached (${vaultData?.used || '?'}/${vaultData?.limit || '?'} NFTs). Visit your profile to see vault details and upgrade options.`);
      } else {
        toast({
          title: 'Creation Failed',
          description: errorMessage,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
            CREATE NFT
          </Heading>
          <Text color="gray.400" mt={2}>
            Mint your digital masterpiece on the blockchain
          </Text>
        </Box>

        {error && (
          <Alert status="error" bg="rgba(236, 72, 153, 0.1)" borderColor="neon.pink">
            <AlertIcon />
            <Box flex="1">
              <Text mb={error.includes('Vault limit') ? 2 : 0}>{error}</Text>
              {error.includes('Vault limit') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/profile')}
                  colorScheme="purple"
                  fontFamily="heading"
                  mt={2}
                >
                  View My Vault
                </Button>
              )}
            </Box>
          </Alert>
        )}

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={6}>
                <FormControl isRequired>
                  <FormLabel color="gray.300" fontFamily="body">NFT Name</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter NFT name"
                    bg="rgba(26, 26, 46, 0.8)"
                    borderColor="cyber.500"
                    _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" fontFamily="body">Description</FormLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your NFT"
                    rows={4}
                    bg="rgba(26, 26, 46, 0.8)"
                    borderColor="cyber.500"
                    _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" fontFamily="body">Media Type</FormLabel>
                  <Select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    bg="rgba(26, 26, 46, 0.8)"
                    borderColor="cyber.500"
                    _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" fontFamily="body">Upload Media</FormLabel>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'audio/*'}
                    bg="rgba(26, 26, 46, 0.8)"
                    borderColor="cyber.500"
                    p={2}
                  />
                  {preview && mediaType === 'image' && (
                    <Box mt={4}>
                      <Image src={preview} alt="Preview" maxH="300px" borderRadius="md" />
                    </Box>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  w="100%"
                  isLoading={loading}
                  fontFamily="heading"
                >
                  MINT NFT
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}

