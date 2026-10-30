import { VaultModal } from "../../components/modals/VaultModal";

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      {/* Global modals */}
      <VaultModal />
    </div>
  );
}
