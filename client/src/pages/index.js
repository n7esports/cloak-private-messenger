import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { CloakClient, parseInvitation } from '../lib/websocketClient';
import InviteModal from '../components/InviteModal';

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [burnAfterSec, setBurnAfterSec] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatFeedRef = useRef(null);
  const activeSessionIdRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());

  const selectSession = (sessionId) => {
    activeSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  };

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Initialize CloakClient & handle URL invitation hash
  useEffect(() => {
    const client = new CloakClient({ url: 'ws://localhost:8080' });
    clientRef.current = client;

    client.onStatusCallback = (status) => setConnected(status === 'connected');

    client.onMessageCallback = (msg) => {
      const targetSessionId =
        activeSessionIdRef.current || client.localQueueId;
      if (!targetSessionId) return;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            const incomingMsg = {
              id: msg.msgId || `${Date.now()}-${Math.random()}`,
              msgId: msg.msgId,
              sender: 'peer',
              text: msg.content,
              burnAfterSec: msg.burnAfterSec || 0,
              burnExpiresAt: null,
              remainingSec: null,
              status: 'delivered',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            return {
              ...s,
              lastMessage: msg.content,
              time: 'Just now',
              messages: [...s.messages, incomingMsg],
            };
          }
          return s;
        })
      );
    };

    client.onReceiptCallback = (msgId, status) => {
      const now = Date.now();
      setSessions((prev) =>
        prev.map((session) => {
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
              nextStatus !== message.status ||
              burnExpiresAt !== message.burnExpiresAt
            ) {
              changed = true;
              return {
                ...message,
                status: nextStatus,
                burnExpiresAt,
                remainingSec: burnExpiresAt
                  ? Math.max(1, Math.ceil((burnExpiresAt - now) / 1000))
                  : message.remainingSec,
              };
            }
            return message;
          });
          return changed ? { ...session, messages } : session;
        })
      );
    };

    let cancelled = false;

    client
      .connect()
      .then(async () => {
        if (cancelled) return;

        const hash = window.location.hash;
        if (hash && hash.includes('queueId=') && hash.includes('pubKey=')) {
          const { queueId, pubKey } = parseInvitation(hash);

          if (queueId && pubKey) {
            try {
              await client.acceptInvitation(queueId, pubKey);
              if (cancelled) return;
              const localSessionId = client.localQueueId;
              const newSession = {
                id: localSessionId,
                name: `Peer #${queueId.slice(0, 4)}`,
                fingerprint: pubKey.slice(0, 16),
                lastMessage: 'Session handshaked over blind relay.',
                time: 'Just now',
                active: true,
                cipherSuite: 'ECDH P-256 + AES-GCM',
                queueLatency: '18ms',
                messages: [
                  { id: 1, sender: 'system', text: 'Ephemeral queue connected via invitation link.', time: 'Now' },
                  { id: 2, sender: 'system', text: 'Session key derived via ECDH P-256.', time: 'Now' },
                ],
              };
              setSessions((prev) => [newSession, ...prev]);
              selectSession(localSessionId);
              client.startPolling(2000);
              window.history.replaceState(null, '', window.location.pathname);
            } catch (err) {
              if (!cancelled) {
                console.error('Failed to accept invitation from URL hash:', err);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Client initialization failed:', err);
        }
      });

    return () => {
      cancelled = true;
      client.disconnect();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, []);

  // Auto-scroll message feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  useEffect(() => {
    const feed = chatFeedRef.current;
    if (!feed || !activeSession) return undefined;

    const markSeen = (element) => {
      const msgId = element.dataset.messageId;
      if (!msgId || seenMessageIdsRef.current.has(msgId)) return;
      seenMessageIdsRef.current.add(msgId);

      setSessions((prev) =>
        prev.map((session) => ({
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

      clientRef.current
        ?.sendAck(msgId, 'seen')
        .catch((error) => console.error('Failed to send seen receipt:', error));
    };

    const incomingMessages = feed.querySelectorAll(
      '[data-incoming-message="true"]'
    );
    const markVisibleMessagesSeen = () => {
      if (document.visibilityState !== 'visible') return;
      const feedBounds = feed.getBoundingClientRect();
      incomingMessages.forEach((element) => {
        if (seenMessageIdsRef.current.has(element.dataset.messageId)) return;
        const messageBounds = element.getBoundingClientRect();
        const visibleHeight =
          Math.min(messageBounds.bottom, feedBounds.bottom) -
          Math.max(messageBounds.top, feedBounds.top);
        if (visibleHeight >= Math.min(messageBounds.height * 0.6, 1)) {
          markSeen(element);
        }
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      markVisibleMessagesSeen();
      const visibilityInterval = setInterval(markVisibleMessagesSeen, 250);
      return () => clearInterval(visibilityInterval);
    }

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

    incomingMessages.forEach((element) => {
      if (!seenMessageIdsRef.current.has(element.dataset.messageId)) {
        observer.observe(element);
      }
    });

    markVisibleMessagesSeen();
    const visibilityInterval = setInterval(markVisibleMessagesSeen, 250);
    return () => {
      observer.disconnect();
      clearInterval(visibilityInterval);
    };
  }, [activeSession, activeSessionId, sessions]);

  useEffect(() => {
    const burnInterval = setInterval(() => {
      const now = Date.now();
      setSessions((prev) => {
        let sessionsChanged = false;
        const nextSessions = prev.map((session) => {
          let sessionChanged = false;
          let lastMessageBurned = false;
          const messages = [];

          session.messages.forEach((message) => {
            if (message.burnExpiresAt && message.burnExpiresAt <= now) {
              if (session.lastMessage === message.text) {
                lastMessageBurned = true;
              }
              message.text = '';
              sessionChanged = true;
              seenMessageIdsRef.current.delete(message.msgId);
              return;
            }

            if (message.burnExpiresAt) {
              const remainingSec = Math.max(
                1,
                Math.ceil((message.burnExpiresAt - now) / 1000)
              );
              if (remainingSec !== message.remainingSec) {
                messages.push({ ...message, remainingSec });
                sessionChanged = true;
                return;
              }
            }
            messages.push(message);
          });

          if (!sessionChanged) return session;
          sessionsChanged = true;
          return {
            ...session,
            messages,
            ...(lastMessageBurned ? { lastMessage: 'Message burned' } : {}),
          };
        });

        return sessionsChanged ? nextSessions : prev;
      });
    }, 1000);

    return () => clearInterval(burnInterval);
  }, []);

  // Generate new invitation link
  const handleNewInvitation = async () => {
    if (!clientRef.current || !connected) {
      alert('Relay Server disconnected. Make sure the Node server is running on port 8080.');
      return;
    }

    try {
      const link = await clientRef.current.createInvitationLink();
      const newQueueId = clientRef.current.localQueueId;

      setInviteLink(link);
      setShowInviteModal(true);

      const newSession = {
        id: newQueueId,
        name: `Peer #${newQueueId.slice(0, 4)}`,
        fingerprint: 'Pending Handshake',
        lastMessage: 'Awaiting peer handshake...',
        time: 'Just now',
        active: true,
        cipherSuite: 'ECDH P-256 + AES-GCM',
        queueLatency: '15ms',
        messages: [
          { id: 1, sender: 'system', text: 'Ephemeral queue created. Share invitation link with peer.', time: 'Now' },
        ],
      };

      setSessions((prev) => [newSession, ...prev]);
      selectSession(newQueueId);
      clientRef.current.startPolling(2000);
    } catch (err) {
      console.error('Error generating invitation link:', err);
      alert('Failed to obtain queue ID from relay server.');
    }
  };

  // Join session manually using code or URL
  const handleConnectSession = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !clientRef.current) return;

    try {
      const { queueId, pubKey } = parseInvitation(inviteCodeInput);

      await clientRef.current.acceptInvitation(queueId, pubKey);
      const localSessionId = clientRef.current.localQueueId;

      const newSession = {
        id: localSessionId,
        name: `Peer #${queueId.slice(0, 4)}`,
        fingerprint: pubKey.slice(0, 16),
        lastMessage: 'Session handshaked manually.',
        time: 'Just now',
        active: true,
        cipherSuite: 'ECDH P-256 + AES-GCM',
        queueLatency: '20ms',
        messages: [
          { id: 1, sender: 'system', text: 'Connected to queue via manual code import.', time: 'Now' },
          { id: 2, sender: 'system', text: 'Session key derived via ECDH P-256.', time: 'Now' },
        ],
      };

      setSessions((prev) => [newSession, ...prev]);
      selectSession(localSessionId);
      clientRef.current.startPolling(2000);
      setInviteCodeInput('');
      setShowJoinModal(false);
    } catch (err) {
      console.error('Failed to connect via code:', err);
      alert('Error establishing key exchange. Verify the code.');
    }
  };

  // Encrypt & send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !clientRef.current || !activeSessionId) return;

    const textToSend = inputMessage.trim();

    try {
      const { msgId, status } = await clientRef.current.sendMessage(
        textToSend,
        burnAfterSec
      );
      const burnExpiresAt =
        status === 'seen' && burnAfterSec > 0
          ? Date.now() + burnAfterSec * 1000
          : null;

      const newMsg = {
        id: msgId,
        msgId,
        sender: 'me',
        text: textToSend,
        burnAfterSec,
        burnExpiresAt,
        remainingSec: burnExpiresAt ? burnAfterSec : null,
        status,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              lastMessage: textToSend,
              time: 'Just now',
              messages: [...s.messages, newMsg],
            };
          }
          return s;
        })
      );

      setInputMessage('');
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
      alert('Cannot send message: Verify that the session key is established.');
    }
  };

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans antialiased">
      {/* 1. LEFT NAVIGATION SIDEBAR */}
      <aside className="w-[320px] flex-shrink-0 flex flex-col border-r border-[#1e293b] bg-[#090d16]/95 backdrop-blur-md relative z-10">
        <div className="p-4 border-b border-[#1e293b]/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-300/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1
                  className="text-base font-bold tracking-tight text-white flex items-center gap-1.5"
                  style={{ fontSize: '1rem', margin: 0 }}
                >
                  Cloak
                  <span className="text-[10px] uppercase tracking-widest font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Zero-Meta
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-mono">P2P Blind Onion Relay</p>
              </div>
            </div>

            <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-full ${connected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <span className="relative flex h-2 w-2">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              <span className={`text-[11px] font-medium tracking-wide font-mono ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                {connected ? 'Relay Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleNewInvitation}
              className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] border border-indigo-400/30 cursor-pointer"
            >
              <span>+ New Invitation</span>
            </button>

            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full h-9 rounded-lg bg-[#111726] hover:bg-[#1e293b] text-slate-200 hover:text-white font-medium text-sm flex items-center justify-center gap-2 border border-[#334155]/60 hover:border-slate-500 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>+ Join Session</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#090d16]/70">
          <span>Active Ephemeral Queues</span>
          <span className="bg-[#1e293b] text-slate-300 px-2 py-0.5 rounded-full font-mono text-[10px]">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center mt-6">No active session queues.</p>
          ) : (
            sessions.map((s) => {
              const isSelected = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-150 border ${
                    isSelected
                      ? 'bg-[#1e293b]/90 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                      : 'bg-[#111726]/60 border-transparent hover:bg-[#161f33] hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                          : 'bg-[#1e293b] text-slate-300 border-slate-700'
                      }`}>
                        🔑
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-100 truncate block">
                          {s.name}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-400/90 font-medium">
                          <span>#{s.id.substring(0, 10)}...</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {s.time}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400 truncate pl-[38px] leading-relaxed">
                    {s.lastMessage}
                  </p>

                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-indigo-500"></div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[#1e293b] bg-[#0c121e] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Mem-RAM Only</span>
          <span className="text-[10px] text-slate-400">No Disk Write</span>
        </div>
      </aside>

      {/* 2. MAIN CHAT PANEL */}
      <main className="flex-1 flex flex-col h-full bg-[#090d16] relative overflow-hidden">
        {activeSession ? (
          <>
            <header className="h-16 px-6 border-b border-[#1e293b] bg-[#090d16]/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#1e293b] border border-slate-700/80 flex items-center justify-center text-indigo-400 font-mono text-sm font-semibold shadow-inner">
                  🔒
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      {activeSession.name}
                    </h2>
                    <span className="text-xs font-mono font-medium text-slate-400 bg-[#1e293b] px-2 py-0.5 rounded border border-slate-700/50">
                      ID: {activeSession.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 font-mono">
                      <span>✓ End-to-End Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111726] border border-slate-800 text-[11px] font-mono text-slate-300">
                  <span>{activeSession.cipherSuite}</span>
                </div>
              </div>
            </header>

            <div
              ref={chatFeedRef}
              className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
            >
              <div className="max-w-xl mx-auto p-3 rounded-xl bg-[#111726]/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-medium text-xs">
                  <span>Forward Secrecy Engaged</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Messages are encrypted locally and wiped immediately upon retrieval.
                </p>
              </div>

              {activeSession.messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e293b]/70 border border-slate-700/60 text-[11px] font-mono text-slate-300 shadow-sm">
                        <span>{msg.text}</span>
                        <span className="text-slate-500 text-[10px] pl-1 font-sans">{msg.time}</span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.sender === 'me';

                return (
                  <div
                    key={msg.id}
                    data-message-id={msg.msgId || undefined}
                    data-incoming-message={msg.sender === 'peer' && msg.msgId ? 'true' : undefined}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
                  >
                    <div className="flex items-end gap-2 max-w-[70%]">
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-md ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none border border-indigo-400/30'
                            : 'bg-[#1e293b] text-slate-100 rounded-bl-none border border-[#334155]/80'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                          {msg.text}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono ${
                            isMe ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {msg.burnExpiresAt && (
                            <span
                              className="mr-auto rounded bg-red-500/15 px-1.5 py-0.5 text-red-300"
                              aria-label={`Message burns in ${msg.remainingSec} seconds`}
                            >
                              🔥 {msg.remainingSec}s
                            </span>
                          )}
                          <span>{msg.time}</span>
                          {isMe && (
                            <span
                              className={
                                msg.status === 'seen'
                                  ? 'text-indigo-300'
                                  : 'text-slate-400'
                              }
                              aria-label={`${msg.status || 'sent'}`}
                              title={msg.status || 'sent'}
                            >
                              {msg.status === 'seen' ||
                              msg.status === 'delivered'
                                ? '✓✓'
                                : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-[#1e293b] bg-[#090d16]/95 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type an encrypted message..."
                    className="w-full h-11 pl-4 pr-12 rounded-xl bg-[#111726] border border-[#334155] focus:border-indigo-500 text-slate-100 text-sm outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Choose emoji"
                    aria-expanded={showEmojiPicker}
                    onClick={() => setShowEmojiPicker((open) => !open)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-lg hover:bg-slate-700/60"
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div
                      role="group"
                      aria-label="Emoji picker"
                      className="absolute bottom-14 right-0 z-20 flex gap-1 rounded-xl border border-slate-700 bg-[#111726] p-2 shadow-xl"
                    >
                      {['😀', '😂', '😊', '😍', '👍', '🙏', '🔥', '❤️'].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            aria-label={`Insert ${emoji}`}
                            onClick={() => {
                              setInputMessage((current) => current + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="rounded-md p-1 text-xl hover:bg-slate-700/70"
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#334155] bg-[#111726] px-2 text-xs text-slate-400">
                  <span className="whitespace-nowrap">Burn</span>
                  <select
                    aria-label="Burn timer"
                    value={burnAfterSec}
                    onChange={(event) =>
                      setBurnAfterSec(Number(event.target.value))
                    }
                    className="max-w-20 bg-transparent text-slate-100 outline-none"
                  >
                    <option value={0}>Off</option>
                    <option value={5}>5s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select or create a session queue to start messaging.
          </div>
        )}
      </main>

      <InviteModal
        open={showInviteModal}
        inviteLink={inviteLink}
        onClose={() => setShowInviteModal(false)}
      />

      {/* 4. JOIN SESSION MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111726] border border-slate-700 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white mb-4">Join Private Session</h3>

            <form onSubmit={handleConnectSession} className="space-y-4">
              <textarea
                rows="3"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="Paste invitation URL or parameters (#queueId=...&pubKey=...)"
                className="w-full p-3 rounded-xl bg-[#090d16] border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}