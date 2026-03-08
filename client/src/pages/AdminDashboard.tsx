import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft, Users, FileText, Shield } from "lucide-react";
import UserManagementPage from "./UserManagementPage";
import BackendLogsPage from "./BackendLogsPage";

type Tab = "users" | "logs";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [, setLocation] = useLocation();

  // Check if user is admin
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Not authenticated");
      }
      return res.json();
    },
  });

  // Redirect to login if not authenticated (using useEffect to avoid render side effects)
  useEffect(() => {
    if (error && !isLoading) {
      setLocation("/admin/login");
    }
  }, [error, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const isAdmin = currentUser?.user?.role === "admin" || currentUser?.user?.role === "superadmin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-4">You need admin privileges to access this page.</p>
            <Button onClick={() => setLocation("/")}>Go to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-800 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="mr-2 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-6 w-6 text-indigo-400 mr-2" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="text-sm text-slate-300">
            {currentUser?.user?.displayName || currentUser?.user?.email}
            <span className="ml-2 px-2 py-1 bg-indigo-600 rounded text-xs">
              {currentUser?.user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            User Management
          </Button>
          <Button
            variant={activeTab === "logs" ? "default" : "outline"}
            onClick={() => setActiveTab("logs")}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Backend Logs
          </Button>
        </div>

        {activeTab === "users" && <UserManagementPage />}
        {activeTab === "logs" && <BackendLogsPage />}
      </div>
    </div>
  );
}
