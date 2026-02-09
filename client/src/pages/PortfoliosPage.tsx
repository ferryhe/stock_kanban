import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortfolios, createPortfolio } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

type PortfolioFormData = {
  name: string;
  initialCash: string;
  type: "live" | "backtest";
};

export default function PortfoliosPage() {
  const queryClient = useQueryClient();
  const { lang, setLang, t } = useI18n();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<PortfolioFormData>({
    name: "",
    initialCash: "100000",
    type: "live",
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
  const errorMessage =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : createMutation.error
        ? String(createMutation.error)
        : "";

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6 gap-3">
        <h1 className="text-3xl font-bold">{t("portfoliosTitle")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("langToggle")}
          </button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? t("portfoliosCancel") : t("portfoliosCreate")}
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("portfoliosCreateNew")}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("portfoliosName")}</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("portfoliosNamePlaceholder")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("portfoliosInitialCash")}</label>
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
              <label className="block text-sm font-medium mb-1">{t("portfoliosType")}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "live" | "backtest" })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="live">{t("portfoliosLiveTrading")}</option>
                <option value="backtest">{t("portfoliosBacktest")}</option>
              </select>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("portfoliosCreating") : t("portfoliosCreateSubmit")}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">{t("portfoliosLoading")}</div>
      ) : portfolios.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 mb-4">{t("portfoliosEmpty")}</p>
          <Button onClick={() => setShowCreateForm(true)}>{t("portfoliosCreateFirst")}</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((portfolio: any) => (
            <Card key={portfolio.id} className="p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">{portfolio.name}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  {t("portfoliosTypeLabel")}: <span className="font-medium">{portfolio.type}</span>
                </p>
                <p className="text-slate-600">
                  {t("portfoliosInitialLabel")}:{" "}
                  <span className="font-medium">${parseFloat(portfolio.initialCash).toFixed(2)}</span>
                </p>
                <p className="text-slate-600">
                  {t("portfoliosCurrentValueLabel")}:{" "}
                  <span className="font-medium">${parseFloat(portfolio.totalValue).toFixed(2)}</span>
                </p>
              </div>
              <Button className="w-full mt-4" variant="outline">
                {t("portfoliosViewDetails")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
