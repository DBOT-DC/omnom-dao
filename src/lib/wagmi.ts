import { http } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

/**
 * Wagmi + RainbowKit configuration for OMNOM DAO.
 *
 * Uses Base chain for EIP-4361 SIWE personal_sign authentication.
 * The chain choice is read-only — this is an off-chain DAO with a frozen
 * token holder snapshot. No on-chain transactions are submitted.
 */
export const config = getDefaultConfig({
  appName: '$OMNOM DAO',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'PLACEHOLDER',
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});
