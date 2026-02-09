import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortfolios, createPortfolio } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function PortfoliosPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    initialCash: "100000",
    type: "live" as const,
  });

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: getPortfolios,
  });

  const createMutation = useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      setShowCreateForm(false);
      setFormData({ name: "", initialCash: "100000", type: "live" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    createMutation.mutate({
      name: formData.name,
      initialCash: parseFloat(formData.initialCash),
      type: formData.type,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Portfolios</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "Cancel" : "Create Portfolio"}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Portfolio</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Portfolio Name</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AI Stock Strategy"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Initial Cash ($)</label>
              <Input
                type="number"
                value={formData.initialCash}
                onChange={(e) => setFormData({ ...formData, initialCash: e.target.value })}
                placeholder="100000"
                required
                min="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "live" | "backtest" })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="live">Live Trading</option>
                <option value="backtest">Backtest</option>
              </select>
            </div>

            {createMutation.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {createMutation.error.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading portfolios...</div>
      ) : portfolios.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 mb-4">No portfolios yet</p>
          <Button onClick={() => setShowCreateForm(true)}>Create your first portfolio</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((portfolio: any) => (
            <Card key={portfolio.id} className="p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">{portfolio.name}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  Type: <span className="font-medium">{portfolio.type}</span>
                </p>
                <p className="text-slate-600">
                  Initial: <span className="font-medium">${parseFloat(portfolio.initialCash).toFixed(2)}</span>
                </p>
                <p className="text-slate-600">
                  Current Value: <span className="font-medium">${parseFloat(portfolio.totalValue).toFixed(2)}</span>
                </p>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Details
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
