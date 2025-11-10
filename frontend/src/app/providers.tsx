'use client';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { Toaster } from 'react-hot-toast';

const cyberpunkTheme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    cyber: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    neon: {
      green: '#00ff88',
      cyan: '#00ffff',
      pink: '#ff00ff',
      purple: '#8b5cf6',
    },
  },
  fonts: {
    heading: "'Orbitron', sans-serif",
    body: "'JetBrains Mono', monospace",
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #050508 100%)',
        color: '#ffffff',
      },
    },
  },
  components: {
    Button: {
      variants: {
        cyber: {
          bg: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          color: 'white',
          _hover: {
            bg: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
          },
          boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
        },
        neon: {
          bg: 'transparent',
          color: '#00ff88',
          border: '2px solid #00ff88',
          _hover: {
            bg: 'rgba(0, 255, 136, 0.1)',
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
          },
          boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 'lg',
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={cyberpunkTheme}>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#00ff88',
            border: '1px solid #8b5cf6',
          },
        }}
      />
    </ChakraProvider>
  );
}

