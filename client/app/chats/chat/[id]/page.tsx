import ChatViewWrapper from "../../../../components/chat/ChatViewWrapper";

export function generateStaticParams() {
  return [];
}

export default function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ChatViewWrapper chatId={params.id} />;
}
