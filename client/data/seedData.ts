import type { Channel, DeviceSession } from '../types';

export interface Conversation {
  id: string;
  name: string;
  avatarText?: string;
  avatarUrl?: string;
  avatarGradient?: string;
  type: 'direct' | 'group';
  unreadCount?: number;
  lastMessage: string;
  prefix?: string;
  timestamp: string;
  verified: boolean;
  tag?: string;
  hasAttachment?: boolean;
  attachmentType?: 'file' | 'audio';
  online?: boolean;
  onionTag?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Attachment {
  name: string;
  size: string;
  hash: string;
  type: 'file' | 'audio' | 'image';
}

export interface Message {
  id: string;
  sender: 'me' | 'elena' | 'other';
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  attachment?: Attachment;
  codeSnippet?: string;
  isMono?: boolean;
}

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'elena-vance',
    name: 'Elena Vance',
    avatarText: 'EV',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUlAm03jw8RsRU-xpdfm4BLISakKBE0i0FmLfdfairLb-606LUow6dz_yOh8aJf84aUJsOsxmO32piCtsNYe95eU0Yn0unur50D69YI15plf7rthIX6SWKchZRHU5-rtim1lrcRRF4sdWd1f4r_Yg5rwJhu-Iht7MOBKwV175a7aI8NZa9WG97f_LshQsy_9IOwtlvQoJZaVAh0m5gEqEDMwAUiT8VHTIG6nXKe_ss3sDDjM8R4ZH0',
    avatarGradient: 'from-surface-container-highest via-surface-bright to-secondary/30 text-primary',
    type: 'direct',
    unreadCount: 1,
    prefix: 'Session updated:',
    lastMessage: 'Double-ratchet keys updated for node exchange',
    timestamp: '2m ago',
    verified: true,
    online: true,
  },
  {
    id: 'dev-core-ops',
    name: 'Dev Core Ops',
    avatarText: 'DC',
    avatarGradient: 'from-surface-container-highest via-surface-container-high to-primary/30 text-secondary',
    type: 'group',
    unreadCount: 3,
    lastMessage: 'Patch deployed to onion relay cluster v2.9b',
    timestamp: '14m ago',
    verified: true,
    tag: 'RELAY',
  },
  {
    id: 'marcus-sterling',
    name: 'Marcus Sterling',
    avatarText: 'MS',
    avatarGradient: 'from-surface-container-highest via-surface-bright to-tertiary/20 text-tertiary',
    type: 'direct',
    unreadCount: 2,
    lastMessage: 'Sign this preimage transaction payload before next block header',
    timestamp: '1h ago',
    verified: true,
    online: true,
  },
  {
    id: 'dr-aris-thorne',
    name: 'Dr. Aris Thorne',
    avatarText: 'AT',
    avatarGradient: 'from-surface-container-high via-surface-container to-surface-bright text-on-surface',
    type: 'direct',
    unreadCount: 0,
    lastMessage: 'Encrypted research paper attachment (.pgp.tar.gz)',
    timestamp: '3h ago',
    verified: true,
    hasAttachment: true,
    attachmentType: 'file',
  },
  {
    id: 'cipher-protocol-09',
    name: 'Cipher Protocol #09',
    avatarText: 'CP',
    avatarGradient: 'from-surface-container-highest via-surface-bright to-secondary-container/40 text-secondary',
    type: 'group',
    unreadCount: 5,
    lastMessage: 'Consensus reached on block #842; shard verification complete',
    timestamp: '5h ago',
    verified: true,
    tag: 'QUORUM',
  },
  {
    id: 'kaelen-miller',
    name: 'Kaelen Miller',
    avatarText: 'KM',
    avatarGradient: 'from-surface-container-high via-surface-bright to-surface-container-highest text-on-surface',
    type: 'direct',
    unreadCount: 0,
    lastMessage: 'Encrypted voice memo attached (0:42)',
    timestamp: 'Yesterday',
    verified: true,
    hasAttachment: true,
    attachmentType: 'audio',
  },
  {
    id: 'sophie-lin',
    name: 'Sophie Lin',
    avatarText: 'SL',
    avatarGradient: 'from-surface-container-high via-surface-container-highest to-primary/20 text-tertiary',
    type: 'direct',
    unreadCount: 0,
    lastMessage: 'Did you verify the fingerprint? Hex: 8A:90:3F...',
    timestamp: 'Yesterday',
    verified: true,
  },
  {
    id: 'anonymous-relayer',
    name: 'Anonymous Relayer',
    avatarText: 'AR',
    avatarGradient: 'from-surface-container-lowest via-surface-container-high to-surface-bright text-secondary',
    type: 'direct',
    unreadCount: 0,
    lastMessage: 'Tunnel re-routed via Zurich multi-hop rendezvous point',
    timestamp: '2d ago',
    verified: true,
    onionTag: 'TOR-v3',
    online: true,
  },
];

export const INITIAL_ELENA_MESSAGES: Message[] = [
  {
    id: 'm1',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDP3Hb0L2lb6YQ8erh63E1y2znehGH74kkiz5g3MIpMm_jPrM9RwKX8O18csudunuvYh_P44DWBWr4ol4uG4-YNhDlo2XStg97QnpRvAkkSyGSZF5yuA8JYuh4eJat6k-jxYndM_Ej4ttK5OZwo9bfiB7NKT_PiUAFEljtXVfnSojKmYpyaQbgT0mTbPulGzERn6U4_sEj8H9Mppf0PyeSBqGCpi9NNWxsWydfc1uw3KLka0nrq3C0l',
    text: 'Cipher, did you finalize the quantum-resistant handshake parameters for Node 7?',
    timestamp: '10:42 AM',
    status: 'read',
    reactions: [{ emoji: '👍', count: 1, users: ['me'] }],
  },
  {
    id: 'm2',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Yes, Kyber-1024 hybrid encapsulation is running in testnet. Deterministic seeds verified across 4 isolated enclave nodes.',
    timestamp: '10:43 AM',
    status: 'read',
  },
  {
    id: 'm3',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Ratchet State: #99a2c • KEM exchange 0 errors in 18,400 rounds.',
    timestamp: '10:43 AM',
    status: 'read',
    isMono: true,
    reactions: [{ emoji: '🎯', count: 1, users: ['elena'] }],
  },
  {
    id: 'm4',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc_FZraibFFtoKECF2dLhTpAx_bvm-OxlTJAiPl_abe1ADehSEbSJ-AMEnoMNzjj1DdPHR9YACRDxMnGGudYbcZZsa4Z8i-aXxBypXxJ7bYImdkeOsgydr0G0a9i9bpojPMGnIe4pgnLyvcw9kyQw2KFLq3PQoH9GYDmrY6SOOL5T1aiZhScXys9Tha0SipVMcaTrYN1AOu2ahmo3qM9pOzU9cSyHKlkDqUFDCLA_fStvUk7XLRecE',
    text: 'Impressive roundtrip throughput! Are you seeing any latency spikes during simultaneous ephemeral secret re-keying?',
    timestamp: '10:45 AM',
    status: 'read',
  },
  {
    id: 'm5',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Under 18ms consistently. Here is the entropy metric snapshot from Zurich Relay 03:',
    timestamp: '10:47 AM',
    status: 'read',
    attachment: {
      name: 'relay_entropy_dump.enc',
      size: '420 KB',
      hash: 'SHA-256: 9b2d...1e84',
      type: 'file',
    },
  },
  {
    id: 'm6',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0tjBKVsIVAe6YOpLphpGB_QsNYC38E08RD4E5a2TSFv8TQXew-nN0p7UxecwRHNoyMRIxY9-F6rXEh423jW1NquDc-kX3sftl6WVPP96SomAFGnnzOQRjaenlWjF7O5ZCq2SCDQDNHTertBb7t0wjj3M6RzGzOMATaheK81VNmkux5LpHC9tcHgVrMUsrFMzr1hHTcN7Ih_Oek0OX1Eq679b8f5aeeiayvkUmvtigWlmJ2Ucc1SPJ',
    text: 'Checking the SHA hash right now against my hardware security module.',
    timestamp: '10:48 AM',
    status: 'read',
    reactions: [{ emoji: '🔍', count: 1, users: ['me'] }],
  },
  {
    id: 'm7',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTpKVsBROX6xCyirMkWl5CXWVjpN9RAcpiufsYZp0ryrNV7GkY9FswrR-bhVZW6Q0m1tThJ5yf2VbdtN1R0VKmJWStUOf6J_vbFfntLCSiU6dEOEnRlWifDk-KDhk87R-4N6d0NVNfn21dYb10lNIWOzYt-OAcpfjzjFDuY_ZldC2sL5mEHwLNvEhAFyocj5z8dk-HVOCWj4ciVVevge50u2seOsVWZzgaIuhRR5WW2cHTQpahWLFk',
    text: 'Hardware validation confirmed. Identity fingerprints match our physical out-of-band verification card from Berlin last month.',
    timestamp: '10:49 AM',
    status: 'read',
  },
  {
    id: 'm8',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Perfect. The 24-hour self-destruct cycle is also initialized for this thread.',
    timestamp: '10:50 AM',
    status: 'read',
  },
  {
    id: 'm9',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBM-BEdJY2xHPdlDx_6EpbW7Yo3ABiOxxRHFMVn4KOMd9Ad5-e40nqeiuFlmB1FPQdjsdFnfAYhMh9TvdOzFs2dEe1WUYhtQSpCfqVEXvVD22995xgyp8iKezB0xXxNbTOyCK_m0u1uJWkfvHEVpP5hsQSj_bxN7PlJiBx1FyNCTKrlJqYQafu9igddMcm_8bdw20GYURCP36cAGwI277Ipud7ZYktoi2AC8dCp641onJXuLGA-fUO8',
    text: 'Understood. Should we invite Julian to this session or spin up a partitioned enclave group?',
    timestamp: '10:51 AM',
    status: 'read',
  },
  {
    id: 'm10',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Let us create a separate partitioned channel so our pairwise ratchet remains unaffected.',
    timestamp: '10:52 AM',
    status: 'read',
  },
  {
    id: 'm11',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBstpM5fnesfSPQB_w57Zu97Lv6tkn6MXS7j2ZvaVaY3gNlViS6E9nTzGz3bKFBj5nzNKYFDalL8qc63GONWnl8d5nZRSzIpvlJCksdbZR5KF11yVUNdYhAoayveZB23HNI0oWAh3qroh7lRIRExLDdmBSlQqC-kNGZaf9MNAC6Mrlb78BZIMrZb6NUEJBm-ZIIGqmpZBmUuf3TPapg3sc0ZYYaQjYcDhK678EUv8QnJJfDxc7ZSQ9I',
    text: 'Agreed. I am generating the invitation link with a one-time cryptographic puzzle.',
    timestamp: '10:53 AM',
    status: 'read',
    reactions: [{ emoji: '⚡', count: 2, users: ['me', 'elena'] }],
  },
  {
    id: 'm12',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Make sure difficulty is set to 24 zero-bits so bot harvesters get bogged down.',
    timestamp: '10:54 AM',
    status: 'read',
  },
  {
    id: 'm13',
    sender: 'elena',
    senderName: 'Elena Vance',
    senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAG71mgV72-wEj_N8h_H7puSzoBMnhagm-PiBWg9EEkznlAkVBC4W7xv8Xn0Y5RwiyXRTodvGWfNlca-HeB6ibJswP6qHhQnIQKWp6-bJI6jFgQhVhaZTBl98ByJiaKuHGLn0pxAKF_4LILICF44LLZOOeZgfZgox6Ir4iyVUY48ChBmJTQFbQ7xFk5XhDduw0kVpW5dB_Br9yAf_qxtp4YvbCvYv5IWh4zgr3JMi6DADv7vxVKJndL',
    text: 'Done. Proof-of-work challenge issued. Standing by for connection handshake.',
    timestamp: '10:55 AM',
    status: 'read',
  },
  {
    id: 'm14',
    sender: 'me',
    senderName: 'Cipher Zero',
    text: 'Listening on socket wss://cloak-vault-eu-3.onion. Key derivation active.',
    timestamp: '10:56 AM',
    status: 'delivered',
  },
];

export const INITIAL_CHANNELS: Channel[] = [
  {
    id: 'security-alerts',
    name: '#security-alerts',
    icon: 'crisis_alert',
    gradient: 'from-error-container/40 via-surface-container-high to-primary/20',
    memberCount: 1420,
    unread: true,
    category: 'broadcast',
    lastActivity: '2m ago',
    lastSnippet: 'Advisory CVE-2025-01 posted',
    verified: true,
    idHash: '0x8a92..f4b1',
    broadcastOnly: true,
    ephemeralHours: 12,
    broadcasts: [
      {
        id: 'b1',
        sender: 'SecOps Dispatch Node #01',
        senderNode: 'Node #01',
        signature: 'SIG: ed25519::7f82c...991a',
        hashMatch: 'SHA-256 MATCH',
        content: 'Advisory CVE-2025-01: Zero-day mitigations applied to onion ingress nodes. Verify client key fingerprint immediately against the public key directory prior to initiating ratcheted sessions.',
        fingerprint: '9A2F 401C BC88 E109 4D30 89EF 0012 CC47',
        timestamp: '14:02:18 UTC',
        relayedByCount: 14,
        payloadSize: '412 Bytes',
      },
    ],
  },
  {
    id: 'general',
    name: '#general',
    icon: 'forum',
    gradient: 'from-secondary-container/40 via-surface-container to-surface-bright',
    memberCount: 3892,
    category: 'public',
    lastActivity: '14m ago',
    lastSnippet: 'Node sync protocol benchmarks',
    verified: true,
    idHash: '0x3c21..8e90',
    broadcastOnly: false,
    ephemeralHours: 24,
    broadcasts: [
      {
        id: 'b2',
        sender: 'Relay Protocol Core',
        senderNode: 'Node #04',
        signature: 'SIG: ed25519::a381e...112b',
        hashMatch: 'SHA-256 MATCH',
        content: 'Periodic relay swarm benchmark complete. Aggregate ingress throughput reached 4.2 Gbps across 18 decentralized nodes with zero unratcheted packet leaks.',
        timestamp: '13:45:00 UTC',
        relayedByCount: 18,
        payloadSize: '298 Bytes',
      },
    ],
  },
  {
    id: 'zero-knowledge-research',
    name: '#zero-knowledge-research',
    icon: 'vpn_key',
    gradient: 'from-tertiary-container/30 via-surface-container-high to-surface-container',
    memberCount: 642,
    category: 'private',
    lastActivity: '1h ago',
    lastSnippet: 'Recursive STARK aggregation',
    verified: true,
    idHash: '0x99e1..aa04',
    broadcastOnly: false,
    ephemeralHours: 48,
    broadcasts: [
      {
        id: 'b3',
        sender: 'ZK Field Labs',
        senderNode: 'Node #07',
        signature: 'SIG: ed25519::dd301...99ef',
        hashMatch: 'SHA-256 MATCH',
        content: 'New benchmark results published for Recursive Plonky3 batch proof verification on mobile ARM chips. Verification under 42ms.',
        timestamp: '12:30:22 UTC',
        relayedByCount: 12,
        payloadSize: '512 Bytes',
      },
    ],
  },
  {
    id: 'core-engineering',
    name: '#core-engineering',
    icon: 'terminal',
    gradient: 'from-surface-bright via-surface-container to-secondary/20',
    memberCount: 184,
    category: 'private',
    lastActivity: '3h ago',
    lastSnippet: 'PR #882: Post-quantum Kyber-1024',
    verified: true,
    idHash: '0x44d2..11c8',
    broadcastOnly: false,
    ephemeralHours: 24,
    broadcasts: [
      {
        id: 'b4',
        sender: 'Post-Quantum Taskforce',
        senderNode: 'Node #02',
        signature: 'SIG: ed25519::18f9a...33d0',
        hashMatch: 'SHA-256 MATCH',
        content: 'Pull Request #882 merged to testnet branch. Kyber-1024 + X25519 hybrid key encapsulation is now default for all new pairwise ratchets.',
        timestamp: '10:14:02 UTC',
        relayedByCount: 16,
        payloadSize: '380 Bytes',
      },
    ],
  },
  {
    id: 'design-system',
    name: '#design-system',
    icon: 'palette',
    gradient: 'from-surface-variant via-surface-container-high to-surface-container-lowest',
    memberCount: 95,
    category: 'public',
    lastActivity: '5h ago',
    lastSnippet: 'Token alignment & optical glass rules',
    verified: true,
    idHash: '0x712a..98cc',
    broadcastOnly: false,
    ephemeralHours: 24,
    broadcasts: [],
  },
  {
    id: 'announcements',
    name: '#announcements',
    icon: 'campaign',
    gradient: 'from-primary-container/30 via-surface-container-low to-surface-bright',
    memberCount: 12408,
    category: 'broadcast',
    lastActivity: '1d ago',
    lastSnippet: 'Network hard fork v4.1 operational',
    verified: true,
    idHash: '0x01a9..22ff',
    broadcastOnly: true,
    ephemeralHours: 72,
    broadcasts: [],
  },
];

export const INITIAL_DEVICES: DeviceSession[] = [
  {
    id: 'dev-1',
    name: 'Zurich Workstation (Linux x86_64)',
    platform: 'Arch Linux Enclave',
    lastSeen: 'Active Now',
    isCurrent: true,
    fingerprint: '0x89ab...4c21',
  },
  {
    id: 'dev-2',
    name: 'Pixel 9 Pro (GrapheneOS)',
    platform: 'Hardware SecEnclave',
    lastSeen: '12m ago',
    isCurrent: false,
    fingerprint: '0x44c1...982b',
  },
  {
    id: 'dev-3',
    name: 'ThinkPad X1 Carbon',
    platform: 'Qubes OS v4.2',
    lastSeen: '3h ago',
    isCurrent: false,
    fingerprint: '0x12d9...77a0',
  },
];
