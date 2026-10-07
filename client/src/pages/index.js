import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { CloakClient, parseInvitation } from '../lib/websocketClient';
import InviteModal from '../components/InviteModal';

const ICON_PATHS = {
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3L21 8l-3-3" />
    </>
  ),
  back: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  minimize: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  qr: (
    <>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" />
      <path d="M14 14h3v3h-3zM19 14h2M19 18v3M14 20h3" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" />
    </>
  ),
  camera: (
    <>
      <path d="M14 5 12.5 3h-5L6 5H3v14h18V5h-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  paperclip: (
    <>
      <path d="m21.4 11.1-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4m-4 4v2" />
    </>
  ),
  edit: (
    <>
      <path d="m16 4 4 4L8 20l-5 1 1-5L16 4Z" />
      <path d="m14 6 4 4" />
    </>
  ),
  close: (
    <>
      <path d="m18 6-12 12M6 6l12 12" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 17v4h14v-4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14m-7-7h14" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
};

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [screen, setScreen] = useState('join');
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showPeerInfo, setShowPeerInfo] = useState(false);
  const [showBurnTimerDialog, setShowBurnTimerDialog] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [chatMenu, setChatMenu] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [burnAfterSec, setBurnAfterSec] = useState(0);

  const relayClientRef = useRef(null);
  const sessionClientsRef = useRef(new Map());
  const messagesEndRef = useRef(null);
  const chatFeedRef = useRef(null);
  const activeSessionIdRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());
  const totalUnreadCount = sessions.reduce(
    (total, session) =>
      total +
      session.messages.filter(
        (message) => message.sender === 'peer' && message.status !== 'seen'
      ).length,
    0
  );

  const selectSession = (sessionId) => {
    activeSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  };
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );

  useEffect(() => {
    if (!chatMenu) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setChatMenu(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [chatMenu]);

  function configureClient(client) {
    client.onStatusCallback = (status) => {
      if (status === 'connected') {
        setConnected(true);
        setConnectionError('');
      }
      if (status === 'disconnected' && client === relayClientRef.current) {
        setConnected(false);
      }
    };
    client.onMessageCallback = (message) => {
      const targetSessionId = client.localQueueId;
      if (!targetSessionId || !sessionClientsRef.current.has(targetSessionId)) {
        return;
      }
      setSessions((previous) =>
        previous.map((session) => {
          if (session.id !== targetSessionId) return session;
          const incomingMessage = {
            id: message.msgId,
            msgId: message.msgId,
            sender: 'peer',
            text: message.content,
            burnAfterSec: message.burnAfterSec || 0,
            burnExpiresAt: null,
            remainingSec: null,
            status: 'delivered',
            time: formatTime(),
          };
          return {
            ...session,
            lastMessage: message.content,
            time: 'Just now',
            messages: [...session.messages, incomingMessage],
          };
        })
      );
    };
    client.onReceiptCallback = (msgId, status) => {
      const now = Date.now();
      setSessions((previous) =>
        previous.map((session) => {
          let changed = false;
          const messages = session.messages.map((message) => {
            if (message.msgId !== msgId || message.sender !== 'me') {
              return message;
            }
            const statusRank = { sent: 0, delivered: 1, seen: 2 };
            const nextStatus =
              statusRank[status] > (statusRank[message.status] ?? -1)
                ? status
                : message.status;
            const burnExpiresAt =
              status === 'seen' &&
              message.burnAfterSec > 0 &&
              !message.burnExpiresAt
                ? now + message.burnAfterSec * 1000
                : message.burnExpiresAt;
            if (
              nextStatus === message.status &&
              burnExpiresAt === message.burnExpiresAt
            ) {
              return message;
            }
            changed = true;
            return {
              ...message,
              status: nextStatus,
              burnExpiresAt,
              remainingSec: burnExpiresAt
                ? Math.max(1, Math.ceil((burnExpiresAt - now) / 1000))
                : message.remainingSec,
            };
          });
          return changed ? { ...session, messages } : session;
        })
      );
    };
  }

  function createSessionClient() {
    const client = new CloakClient();
    configureClient(client);
    return client;
  }

  useEffect(() => {
    const client = new CloakClient();
    relayClientRef.current = client;
    configureClient(client);

    let cancelled = false;
    client
      .connect()
      .then(async () => {
        if (cancelled) return;
        const invitationHash = window.location.hash;
        if (
          !invitationHash.includes('queueId=') ||
          !invitationHash.includes('pubKey=')
        ) {
          return;
        }
        const { queueId, pubKey } = parseInvitation(invitationHash);
        sessionClientsRef.current.set(queueId, client);
        try {
          await client.acceptInvitation(queueId, pubKey);
          if (cancelled) return;
          const localSessionId = client.localQueueId;
          const session = {
            id: localSessionId,
            name: `Peer ${queueId.slice(0, 4)}`,
            fingerprint: pubKey.slice(0, 16),
            lastMessage: 'Session established over blind relay.',
            time: 'Just now',
            active: true,
            cipherSuite: 'ECDH P-256 + AES-GCM',
            messages: [
              {
                id: `${localSessionId}-system`,
                sender: 'system',
                text: 'Ephemeral queue connected via invitation link.',
                time: 'Now',
              },
            ],
          };
          setSessions((previous) => [session, ...previous]);
          selectSession(localSessionId);
          setScreen('chat');
          window.history.replaceState(null, '', window.location.pathname);
        } catch (error) {
          sessionClientsRef.current.delete(queueId);
          if (!cancelled) {
            console.error('Failed to accept invitation from URL hash:', error);
            setConnectionError(
              'The invitation could not be accepted. Check the link and try again.'
            );
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Cloak relay initialization failed:', error);
          setConnectionError(
            'Relay unavailable. Check your connection and retry the page.'
          );
        }
      });

    return () => {
      cancelled = true;
      client.disconnect();
      sessionClientsRef.current.forEach((sessionClient) => {
        if (sessionClient !== client) sessionClient.disconnect();
      });
      sessionClientsRef.current.clear();
      if (relayClientRef.current === client) relayClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  useEffect(() => {
    const feed = chatFeedRef.current;
    if (
      !feed ||
      !activeSession ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const markSeen = (element) => {
      const msgId = element.dataset.messageId;
      if (!msgId || seenMessageIdsRef.current.has(msgId)) return;
      seenMessageIdsRef.current.add(msgId);
      setSessions((previous) =>
        previous.map((session) => ({
          ...session,
          messages: session.messages.map((message) => {
            if (message.msgId !== msgId || message.sender !== 'peer') {
              return message;
            }
            const burnExpiresAt =
              message.burnAfterSec > 0
                ? Date.now() + message.burnAfterSec * 1000
                : null;
            return {
              ...message,
              status: 'seen',
              burnExpiresAt,
              remainingSec: burnExpiresAt ? message.burnAfterSec : null,
            };
          }),
        }))
      );
      sessionClientsRef.current
        .get(activeSessionId)
        ?.sendAck(msgId, 'seen')
        .catch((error) => console.error('Failed to send seen receipt:', error));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            markSeen(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    feed
      .querySelectorAll('[data-incoming-message="true"]')
      .forEach((element) => {
        if (!seenMessageIdsRef.current.has(element.dataset.messageId)) {
          observer.observe(element);
        }
      });
    return () => observer.disconnect();
  }, [activeSessionId, activeSession?.messages.length]);

  useEffect(() => {
    const burnInterval = setInterval(() => {
      const now = Date.now();
      setSessions((previous) => {
        let changed = false;
        const updated = previous.map((session) => {
          let sessionChanged = false;
          let lastMessageBurned = false;
          const messages = [];
          session.messages.forEach((message) => {
            if (message.burnExpiresAt && message.burnExpiresAt <= now) {
              sessionChanged = true;
              if (session.lastMessage === message.text) lastMessageBurned = true;
              seenMessageIdsRef.current.delete(message.msgId);
              return;
            }
            if (message.burnExpiresAt) {
              const remainingSec = Math.max(
                1,
                Math.ceil((message.burnExpiresAt - now) / 1000)
              );
              if (remainingSec !== message.remainingSec) {
                sessionChanged = true;
                messages.push({ ...message, remainingSec });
                return;
              }
            }
            messages.push(message);
          });
          if (!sessionChanged) return session;
          changed = true;
          return {
            ...session,
            messages,
            ...(lastMessageBurned ? { lastMessage: 'Message burned' } : {}),
          };
        });
        return changed ? updated : previous;
      });
    }, 1000);
    return () => clearInterval(burnInterval);
  }, []);

  async function handleNewInvitation() {
    if (!connected) {
      setConnectionError('Connect to the relay before creating an invitation.');
      return;
    }
    const client = createSessionClient();
    try {
      const link = await client.createInvitationLink();
      const newSessionId = client.localQueueId;
      sessionClientsRef.current.set(newSessionId, client);
      setInviteLink(link);
      setShowInviteModal(true);
      const newSession = {
        id: newSessionId,
        name: `Peer ${newSessionId.slice(0, 4)}`,
        fingerprint: 'Pending handshake',
        inviteLink: link,
        lastMessage: 'Awaiting peer handshake...',
        time: 'Just now',
        active: true,
        cipherSuite: 'ECDH P-256 + AES-GCM',
        messages: [
          {
            id: `${newSessionId}-system`,
            sender: 'system',
            text: 'Ephemeral queue created. Share the invitation with your peer.',
            time: 'Now',
          },
        ],
      };
      setSessions((previous) => [newSession, ...previous]);
      selectSession(newSessionId);
      setScreen('chat');
    } catch (error) {
      client.disconnect();
      console.error('Failed to generate an invitation:', error);
      setConnectionError('Could not create an invitation. Please try again.');
    }
  }

  async function handleConnectSession(event) {
    event.preventDefault();
    if (!inviteCodeInput.trim()) {
      setJoinError('Paste a valid invitation link or code to continue.');
      return;
    }
    setJoinError('');
    let sessionClient;
    let queueId;
    try {
      const invitation = parseInvitation(inviteCodeInput);
      queueId = invitation.queueId;
      sessionClient = createSessionClient();
      sessionClientsRef.current.set(queueId, sessionClient);
      await sessionClient.acceptInvitation(queueId, invitation.pubKey);
      const localSessionId = sessionClient.localQueueId;
      const session = {
        id: localSessionId,
        name: `Peer ${queueId.slice(0, 4)}`,
        fingerprint: invitation.pubKey.slice(0, 16),
        lastMessage: 'Session handshaked manually.',
        time: 'Just now',
        active: true,
        cipherSuite: 'ECDH P-256 + AES-GCM',
        messages: [
          {
            id: `${localSessionId}-system`,
            sender: 'system',
            text: 'Connected to queue using a one-time invitation.',
            time: 'Now',
          },
        ],
      };
      setSessions((previous) => [session, ...previous]);
      selectSession(localSessionId);
      setScreen('chat');
      setInviteCodeInput('');
      setShowJoinModal(false);
    } catch (error) {
      if (queueId) sessionClientsRef.current.delete(queueId);
      sessionClient?.disconnect();
      console.error('Failed to connect with invitation:', error);
      setJoinError(
        error instanceof Error
          ? error.message
          : 'Could not establish the secure session.'
      );
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const client = sessionClientsRef.current.get(activeSessionId);
    if (!inputMessage.trim() || !client || !activeSessionId) return;
    const textToSend = inputMessage.trim();
    try {
      const { msgId, status } = await client.sendMessage(
        textToSend,
        burnAfterSec
      );
      const burnExpiresAt =
        status === 'seen' && burnAfterSec > 0
          ? Date.now() + burnAfterSec * 1000
          : null;
      const newMessage = {
        id: msgId,
        msgId,
        sender: 'me',
        text: textToSend,
        burnAfterSec,
        burnExpiresAt,
        remainingSec: burnExpiresAt ? burnAfterSec : null,
        status,
        time: formatTime(),
      };
      setSessions((previous) =>
        previous.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                lastMessage: textToSend,
                time: 'Just now',
                messages: [...session.messages, newMessage],
              }
            : session
        )
      );
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send encrypted message:', error);
      setConnectionError(
        'Message could not be sent. Check the secure connection.'
      );
    }
  }

  function openJoinDialog() {
    setJoinError('');
    setShowJoinModal(true);
  }

  async function handleOpenQr() {
    const invitationLink = activeSession?.inviteLink || inviteLink;
    if (invitationLink) {
      setInviteLink(invitationLink);
      setShowInviteModal(true);
      return;
    }
    await handleNewInvitation();
  }

  function handleSelectSession(sessionId) {
    selectSession(sessionId);
    const session = sessions.find((entry) => entry.id === sessionId);
    setInviteLink(session?.inviteLink || '');
    setInputMessage('');
    setScreen('chat');
  }

  function handleBackFromChat() {
    selectSession(null);
    setInputMessage('');
    setChatMenu(null);
    setScreen('chats');
  }

  function openChatMenu(x, y) {
    const menuWidth = 248;
    const menuHeight = 336;
    setChatMenu({
      x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8)),
    });
  }

  function handleChatMenuAction(action) {
    setChatMenu(null);
    if (!activeSession) return;
    switch (action) {
      case 'info':
        setShowPeerInfo(true);
        break;
      case 'search':
        setShowMessageSearch(true);
        break;
      case 'burn':
        setShowBurnTimerDialog(true);
        break;
      case 'export': {
        try {
          const content = activeSession.messages
            .map((message) => `[${message.time}] ${message.sender}: ${message.text}`)
            .join('\n');
          const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(file);
          const download = document.createElement('a');
          download.href = url;
          download.download = `${activeSession.name.replace(/[^a-z0-9-_]/gi, '_')}.txt`;
          download.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 0);
        } catch (error) {
          console.error('Failed to export the chat:', error);
          setConnectionError('Could not export this chat.');
        }
        break;
      }
      case 'close':
        handleBackFromChat();
        break;
      case 'clear':
        setShowClearChatConfirm(true);
        break;
      case 'delete':
        setShowDeleteChatConfirm(true);
        break;
      default:
        break;
    }
  }

  function handleClearChat() {
    if (!activeSessionId) return;
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, lastMessage: '', messages: [] }
          : session
      )
    );
    seenMessageIdsRef.current.clear();
    setShowClearChatConfirm(false);
  }

  function handleDeleteChat() {
    if (!activeSessionId) return;
    const roomClient = sessionClientsRef.current.get(activeSessionId);
    if (roomClient) {
      roomClient.disconnect();
      sessionClientsRef.current.delete(activeSessionId);
      if (roomClient === relayClientRef.current) {
        relayClientRef.current = null;
        setConnected(false);
      }
    }
    setSessions((previous) =>
      previous.filter((session) => session.id !== activeSessionId)
    );
    seenMessageIdsRef.current.clear();
    selectSession(null);
    setInputMessage('');
    setInviteLink('');
    setShowDeleteChatConfirm(false);
    setScreen('chats');
  }

  function handleNuke() {
    const clients = new Set([
      relayClientRef.current,
      ...sessionClientsRef.current.values(),
    ]);
    clients.forEach((client) => client?.disconnect());
    relayClientRef.current = null;
    sessionClientsRef.current.clear();
    setSessions([]);
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    setInputMessage('');
    setInviteLink('');
    seenMessageIdsRef.current.clear();
    setShowNukeConfirm(false);
    window.history.replaceState(null, '', window.location.pathname);
    window.requestAnimationFrame(() => window.location.reload());
  }

  const currentRoomName =
    screen === 'join'
      ? 'Join a room'
      : screen === 'chats'
        ? 'Your chats'
        : activeSession?.name || 'Cloak';
  const visibleMessages = activeSession?.messages.filter((message) =>
    `${message.sender} ${message.text || ''}`
      .toLowerCase()
      .includes(messageSearch.toLowerCase())
  );
  const filteredSessions = sessions.filter((session) =>
    `${session.name} ${session.lastMessage || ''}`
      .toLowerCase()
      .includes(conversationSearch.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Cloak — Private Messenger</title>
        <meta
          name="description"
          content="Ephemeral end-to-end encrypted messaging"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <main className="w-full h-screen overflow-hidden flex flex-row bg-[#09090b] font-sans text-zinc-100 antialiased">
        <aside
          className={`${screen === 'chat' && activeSession ? 'hidden' : 'flex'} md:flex w-full md:w-80 lg:w-96 h-full bg-[#18181b] border-r border-zinc-800 flex-col shrink-0`}
        >
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-800 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-900 bg-emerald-950/60 font-semibold text-emerald-200">
                C
              </span>
              <h1 className="truncate text-base font-semibold text-zinc-100">
                Cloak Vault
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Create a new room"
                className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300"
                onClick={handleNewInvitation}
                type="button"
              >
                <Icon name="plus" />
              </button>
              <button
                aria-label="Join a room"
                className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={openJoinDialog}
                type="button"
              >
                <Icon name="key" />
              </button>
            </div>
          </div>

          <label className="relative mx-3 my-3 block shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              aria-label="Search conversations"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-800"
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Search or start new room"
              type="search"
              value={conversationSearch}
            />
          </label>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {filteredSessions.map((session) => {
              const unreadCount = session.messages.filter(
                (message) =>
                  message.sender === 'peer' && message.status !== 'seen'
              ).length;
              return (
                <button
                  className={`flex min-h-[76px] w-full items-center gap-3 border-l-2 px-3 py-2 text-left transition ${
                    session.id === activeSessionId && screen === 'chat'
                      ? 'border-emerald-500 bg-zinc-800/80'
                      : 'border-transparent hover:bg-zinc-800/50'
                  }`}
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  type="button"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-emerald-900 bg-emerald-950/60 font-semibold text-emerald-200">
                    {session.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {session.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {session.time || formatTime()}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-zinc-400">
                        {session.lastMessage || 'No messages yet.'}
                      </span>
                      <span
                        aria-label={`${unreadCount} unread messages`}
                        className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[10px] font-semibold ${
                          unreadCount
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-700/70 text-zinc-400'
                        }`}
                      >
                        {unreadCount}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredSessions.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">
                {conversationSearch
                  ? 'No matching conversations.'
                  : 'No conversations yet. Create or join a room.'}
              </p>
            )}
          </div>
        </aside>

        <div
          className={`h-full min-w-0 flex-1 flex-col bg-[#09090b] ${
            screen === 'chat' && activeSession
              ? 'flex'
              : 'hidden md:flex'
          }`}
        >
        <header
          className="z-20 shrink-0 border-b border-zinc-800 bg-[#0e0e10]/95 backdrop-blur-lg"
          onContextMenu={(event) => {
            if (!activeSession) return;
            event.preventDefault();
            openChatMenu(event.clientX, event.clientY);
          }}
        >
          <div className="mx-auto flex min-h-[68px] w-full max-w-5xl items-center justify-between gap-3 px-3 sm:px-5 md:min-h-[76px] md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {activeSession && (
                <>
                  <button
                    aria-label="Back to chats"
                    className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={handleBackFromChat}
                    type="button"
                  >
                    <Icon name="back" className="h-5 w-5" />
                  </button>
                  <span
                    aria-label={`${totalUnreadCount} unread messages across all conversations`}
                    className="min-w-5 text-center font-mono text-xs font-semibold tabular-nums text-emerald-300"
                  >
                    {totalUnreadCount}
                  </span>
                </>
              )}
              <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-900 bg-emerald-950/60 font-mono text-sm font-semibold text-emerald-200">
                {currentRoomName.slice(0, 1).toUpperCase()}
                <span
                  aria-label={connected ? 'Relay connected' : 'Relay disconnected'}
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0e0e10] ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <h1 className="max-w-[55vw] truncate text-sm font-semibold text-zinc-100 sm:max-w-sm md:text-base">
                    {currentRoomName}
                  </h1>
                  {activeSession && (
                    <button
                      aria-label="Edit room title"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={() => {
                        const nextName = window.prompt('Room title', currentRoomName);
                        if (nextName?.trim() && activeSession) {
                          setSessions((previous) =>
                            previous.map((session) =>
                              session.id === activeSession.id
                                ? { ...session, name: nextName.trim() }
                                : session
                            )
                          );
                        }
                      }}
                      type="button"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  />
                  <span className="truncate text-zinc-400">
                    {inputMessage.trim()
                      ? 'You are typing…'
                      : activeSession
                        ? 'End-to-end encrypted'
                        : connected
                          ? 'Ready to connect'
                          : 'Connecting to relay…'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <span
                className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] md:inline-flex ${connected ? 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300' : 'border-rose-900/70 bg-rose-950/30 text-rose-300'}`}
              >
                <Icon name="lock" className="h-3.5 w-3.5" />
                {connected ? 'Relay connected' : 'Relay disconnected'}
              </span>
              <button
                aria-label="Join a room"
                className={`${activeSession ? 'hidden md:grid' : 'grid'} h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`}
                onClick={openJoinDialog}
                type="button"
              >
                <Icon name="camera" />
              </button>
              <button
                aria-label="Open QR access"
                className={`${activeSession ? 'hidden md:grid' : 'grid'} h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`}
                onClick={handleOpenQr}
                type="button"
              >
                <Icon name="qr" />
              </button>
              <button
                aria-label="Nuke session"
                className="hidden h-11 items-center gap-2 rounded-xl border border-rose-900/80 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/50 md:inline-flex"
                onClick={() => setShowNukeConfirm(true)}
                type="button"
              >
                <Icon name="trash" className="h-4 w-4" />
                Nuke
              </button>
              {activeSession && (
                <button
                  aria-label="Open chat menu"
                  className="grid h-11 w-11 place-items-center rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white md:hidden"
                  onClick={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    openChatMenu(bounds.right - 248, bounds.bottom + 4);
                  }}
                  type="button"
                >
                  <Icon name="more" />
                </button>
              )}
            </div>
          </div>
        </header>

        {connectionError && (
          <div
            aria-live="polite"
            className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-rose-900/70 bg-rose-950/30 px-4 py-2 text-xs text-rose-200"
            role="status"
          >
            <span className="min-w-0">{connectionError}</span>
            <button
              aria-label="Dismiss message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-rose-900/40"
              onClick={() => setConnectionError('')}
              type="button"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="flex min-h-0 w-full flex-1 flex-col">
          {screen === 'chat' && activeSession ? (
            <div
              aria-label="Encrypted message stream"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 md:px-8 md:py-7"
              ref={chatFeedRef}
            >
              {showMessageSearch && (
                <div className="mx-auto mb-4 flex w-full max-w-3xl items-center gap-2">
                  <input
                    aria-label="Search messages"
                    autoFocus
                    className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-700"
                    onChange={(event) => setMessageSearch(event.target.value)}
                    placeholder="Search messages"
                    type="search"
                    value={messageSearch}
                  />
                  <button
                    aria-label="Close message search"
                    className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800"
                    onClick={() => {
                      setShowMessageSearch(false);
                      setMessageSearch('');
                    }}
                    type="button"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              )}
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <div className="mx-auto max-w-lg rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-300">
                    <Icon name="lock" className="h-3.5 w-3.5" />
                    Forward secrecy engaged
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                    Messages are encrypted in the client and removed from this view when they burn.
                  </p>
                </div>

                {visibleMessages.map((message) => {
                  if (message.sender === 'system') {
                    return (
                      <div
                        className="flex justify-center py-1"
                        key={message.id}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openChatMenu(event.clientX, event.clientY);
                        }}
                      >
                        <span className="max-w-full rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-center font-mono text-[10px] leading-4 text-zinc-400">
                          {message.text}
                        </span>
                      </div>
                    );
                  }
                  const isMe = message.sender === 'me';
                  return (
                    <div
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      data-incoming-message={
                        message.sender === 'peer' && message.msgId
                          ? 'true'
                          : undefined
                      }
                      data-message-id={message.msgId || undefined}
                      key={message.id}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openChatMenu(event.clientX, event.clientY);
                      }}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${isMe ? 'rounded-br-md border border-emerald-700/50 bg-emerald-900/70 text-emerald-50' : 'rounded-bl-md border border-zinc-700/80 bg-zinc-800 text-zinc-100'}`}
                      >
                        {!isMe && (
                          <p className="mb-1 font-mono text-[10px] font-medium text-emerald-300">
                            Verified peer
                          </p>
                        )}
                        {message.text && (
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">
                            {message.text}
                          </p>
                        )}
                        <div
                          className={`mt-1.5 flex items-center justify-end gap-1.5 font-mono text-[10px] ${isMe ? 'text-emerald-200/70' : 'text-zinc-500'}`}
                        >
                          {message.burnExpiresAt && (
                            <span className="mr-auto inline-flex items-center gap-1 rounded-md bg-rose-950/60 px-1.5 py-0.5 text-rose-200">
                              <Icon name="clock" className="h-3 w-3" />
                              {message.remainingSec}s
                            </span>
                          )}
                          <span>{message.time}</span>
                          {isMe && (
                            <span
                              aria-label={`${message.status || 'sent'}`}
                              className={`inline-flex items-center ${message.status === 'seen' ? 'text-sky-300' : 'text-emerald-300/70'}`}
                              title={message.status || 'sent'}
                            >
                              <Icon name="check" className="h-3 w-3" />
                              {(message.status === 'seen' ||
                                message.status === 'delivered') && (
                                <Icon name="check" className="-ml-1 h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {visibleMessages.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    {messageSearch ? 'No matching messages.' : 'No messages yet.'}
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald-900/70 bg-emerald-950/40 text-emerald-300">
                <Icon name="shield" className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-zinc-100">
                Start a private conversation
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Create a one-time invitation or join a peer&apos;s room. No account or saved chat history required.
              </p>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!connected}
                  onClick={handleNewInvitation}
                  type="button"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Create invitation
                </button>
                <button
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                  onClick={openJoinDialog}
                  type="button"
                >
                  <Icon name="key" className="h-4 w-4" />
                  Join with code
                </button>
              </div>
            </div>
          )}
        </section>

        <footer
          className={`${screen === 'chat' && activeSession ? '' : 'hidden'} z-10 shrink-0 border-t border-zinc-800 bg-[#101012]`}
        >
          <form
            className="mx-auto flex w-full max-w-4xl items-end gap-1.5 px-2 py-2.5 sm:gap-2 sm:px-4 md:px-6 md:py-4"
            onSubmit={handleSendMessage}
          >
            <button
              aria-label="Attachments are not available yet"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-500 sm:rounded-xl"
              disabled
              title="Attachments are not available yet"
              type="button"
            >
              <Icon name="paperclip" />
            </button>
            <input
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-[14px] text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
              disabled={!activeSession}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder="Message securely"
              type="text"
              value={inputMessage}
            />
            <label className="hidden h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-400 sm:flex">
              <Icon name="clock" className="h-4 w-4 text-rose-300" />
              <select
                aria-label="Message burn timer"
                className="max-w-[76px] bg-transparent text-zinc-200 outline-none disabled:opacity-50"
                disabled={!activeSession}
                onChange={(event) => setBurnAfterSec(Number(event.target.value))}
                value={burnAfterSec}
              >
                <option className="bg-zinc-900" value={0}>Off</option>
                <option className="bg-zinc-900" value={5}>5 sec</option>
                <option className="bg-zinc-900" value={30}>30 sec</option>
                <option className="bg-zinc-900" value={60}>60 sec</option>
              </select>
            </label>
            <button
              aria-label="Send encrypted message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-xl"
              disabled={!activeSession || !inputMessage.trim()}
              type="submit"
            >
              <Icon name="send" className="h-[18px] w-[18px]" />
            </button>
          </form>
          {activeSession && (
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 pb-2 sm:hidden">
              <span className="text-[10px] text-zinc-500">Burn after</span>
              <label className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-[11px] text-zinc-400">
                <Icon name="clock" className="h-3.5 w-3.5 text-rose-300" />
                <select
                  aria-label="Message burn timer"
                  className="max-w-[76px] bg-transparent text-zinc-200 outline-none"
                  onChange={(event) => setBurnAfterSec(Number(event.target.value))}
                  value={burnAfterSec}
                >
                  <option className="bg-zinc-900" value={0}>Off</option>
                  <option className="bg-zinc-900" value={5}>5 sec</option>
                  <option className="bg-zinc-900" value={30}>30 sec</option>
                  <option className="bg-zinc-900" value={60}>60 sec</option>
                </select>
              </label>
            </div>
          )}
        </footer>

        </div>
      </main>

      {chatMenu && activeSession && (
        <>
          <button
            aria-label="Close chat menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setChatMenu(null)}
            type="button"
          />
          <div
            className="fixed z-50 w-60 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
            role="menu"
            style={{ left: chatMenu.x, top: chatMenu.y }}
          >
            {[
              { id: 'info', label: 'Contact / Peer Info', icon: 'info' },
              { id: 'search', label: 'Search Messages', icon: 'search' },
              { id: 'burn', label: 'Disappearing Messages / Burn Timer', icon: 'clock' },
              { id: 'export', label: 'Export Chat', icon: 'download' },
              { id: 'close', label: 'Close Chat', icon: 'minimize' },
              { id: 'clear', label: 'Clear Chat', icon: 'close' },
              { id: 'delete', label: 'Delete / Nuke Chat', icon: 'trash' },
            ].map((item) => (
              <button
                className={`flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm transition hover:bg-zinc-800 ${
                  item.id === 'delete'
                    ? 'text-rose-300 hover:text-rose-200'
                    : 'text-zinc-200'
                }`}
                key={item.id}
                onClick={() => handleChatMenuAction(item.id)}
                role="menuitem"
                type="button"
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {showPeerInfo && activeSession && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowPeerInfo(false)}
          role="presentation"
        >
          <section
            aria-labelledby="peer-info-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-emerald-400">
                  Secure conversation
                </p>
                <h2 className="mt-1 text-lg font-semibold" id="peer-info-title">
                  {activeSession.name}
                </h2>
              </div>
              <button
                aria-label="Close peer information"
                className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800"
                onClick={() => setShowPeerInfo(false)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Fingerprint</dt>
                <dd className="mt-1 break-all font-mono text-zinc-200">
                  {activeSession.fingerprint}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Cipher suite</dt>
                <dd className="mt-1 text-zinc-200">{activeSession.cipherSuite}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {showBurnTimerDialog && activeSession && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowBurnTimerDialog(false)}
          role="presentation"
        >
          <section
            aria-labelledby="burn-timer-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 className="text-lg font-semibold" id="burn-timer-title">
              Disappearing messages
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Choose how long sent messages remain after they are seen.
            </p>
            <label className="mt-5 block text-xs font-medium text-zinc-400" htmlFor="chat-burn-timer">
              Burn timer
            </label>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-600"
              id="chat-burn-timer"
              onChange={(event) => setBurnAfterSec(Number(event.target.value))}
              value={burnAfterSec}
            >
              <option value={0}>Off</option>
              <option value={5}>5 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
            <button
              className="mt-5 min-h-11 w-full rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              onClick={() => setShowBurnTimerDialog(false)}
              type="button"
            >
              Done
            </button>
          </section>
        </div>
      )}

      {showClearChatConfirm && activeSession && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowClearChatConfirm(false)}
          role="presentation"
        >
          <section
            aria-labelledby="clear-chat-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <h2 className="font-semibold" id="clear-chat-title">Clear chat history?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This removes all messages from this device but keeps the secure room and its key.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
                onClick={() => setShowClearChatConfirm(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500"
                onClick={handleClearChat}
                type="button"
              >
                Clear messages
              </button>
            </div>
          </section>
        </div>
      )}

      {showDeleteChatConfirm && activeSession && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowDeleteChatConfirm(false)}
          role="presentation"
        >
          <section
            aria-labelledby="delete-chat-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-rose-900/70 bg-zinc-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <h2 className="font-semibold" id="delete-chat-title">Delete this chat?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This disconnects the room and purges its key material from this device. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
                onClick={() => setShowDeleteChatConfirm(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500"
                onClick={handleDeleteChat}
                type="button"
              >
                Delete chat
              </button>
            </div>
          </section>
        </div>
      )}

      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowJoinModal(false)}
          role="presentation"
        >
          <section
            aria-labelledby="join-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100" id="join-title">
                  Join a private room
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Paste the one-time invitation link shared by your peer.
                </p>
              </div>
              <button
                aria-label="Close join dialog"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => setShowJoinModal(false)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <form className="mt-5 space-y-3" onSubmit={handleConnectSession}>
              <label
                className="block text-xs font-medium uppercase tracking-wider text-zinc-400"
                htmlFor="invitation-code"
              >
                Invitation link or code
              </label>
              <textarea
                autoComplete="off"
                className="min-h-24 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                id="invitation-code"
                onChange={(event) => setInviteCodeInput(event.target.value)}
                placeholder="https://…/#queueId=…&pubKey=…"
                value={inviteCodeInput}
              />
              {joinError && (
                <p
                  aria-live="polite"
                  className="text-sm text-rose-300"
                  role="alert"
                >
                  {joinError}
                </p>
              )}
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                type="submit"
              >
                <Icon name="key" className="h-4 w-4" />
                Establish secure session
              </button>
            </form>
          </section>
        </div>
      )}
      {showInviteModal && (
        <InviteModal
          inviteLink={inviteLink}
          onClose={() => setShowInviteModal(false)}
          open={showInviteModal}
        />
      )}
      {showNukeConfirm && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowNukeConfirm(false)}
          role="presentation"
        >
          <section
            aria-labelledby="nuke-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-rose-900/70 bg-zinc-900 p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-950/70 text-rose-300">
                <Icon name="trash" />
              </span>
              <div>
                <h2 className="font-semibold text-zinc-100" id="nuke-title">
                  Clear this session?
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  This disconnects the relay, clears the in-memory room and messages, and reloads a clean conversation.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                onClick={() => setShowNukeConfirm(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500"
                onClick={handleNuke}
                type="button"
              >
                Clear and reload
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
