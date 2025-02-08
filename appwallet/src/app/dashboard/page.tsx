import { WalletInfo } from "@/components/wallet-info";
import { WalletActivity } from "@/components/wallet-activity";
import { WalletGraph } from "@/components/wallet-graph";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-3">
      <h1 className="text-3xl font-bold">Wallet Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <WalletInfo />
        </div>
        <div className="lg:col-span-2">
          <WalletGraph />
        </div>
      </div>
      <WalletActivity />
    </div>
  );
}
