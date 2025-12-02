"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  Bot,
  Zap,
  Plug,
  Folder,
  FileText,
  ChevronRight,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string;
  children?: NavItem[];
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: "All chats",
      icon: <MessageSquare className="h-4 w-4" />,
      href: "/",
    },
    {
      label: "Custom Agents",
      icon: <Bot className="h-4 w-4" />,
      href: "/idea",
    },
  ];

  const workflowsItem: NavItem = {
    label: "Builds",
    icon: <Zap className="h-4 w-4" />,
    href: "/",
  };

  const integrationsItem: NavItem = {
    label: "Integrations",
    icon: <Plug className="h-4 w-4" />,
    href: "#",
  };

  const knowledgeBaseItems: NavItem[] = [
    {
      label: "Repositories",
      icon: <Folder className="h-4 w-4" />,
      href: "/repo",
    },
    {
      label: "Text resources",
      icon: <FileText className="h-4 w-4" />,
      href: "#",
      badge: "Coming soon",
    },
  ];

  const handleNavClick = (href?: string) => {
    if (href && href !== "#") {
      router.push(href);
    }
  };

  const isActive = (href?: string) => {
    if (!href || href === "#") return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
        <Image
          src="/logo-no-text.png"
          alt="potpie.ai"
          width={24}
          height={24}
          className="w-12 h-12 object-contain"
          priority
        />
        <span className="text-2xl font-semibold text-gray-900">
          potpie
          <span className="text-2xl font-semibold text-primary">.</span>ai
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* New Chat Button */}
        <div className="px-4 mb-6">
          <Button
            className="w-full bg-black hover:bg-black/90 text-white font-medium"
            onClick={() => router.push("/idea")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />+ New Chat
          </Button>
        </div>

        {/* Codebase Chat */}
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Codebase Chat
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Builds */}
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Builds
          </div>
          <button
            onClick={() => handleNavClick(workflowsItem.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(workflowsItem.href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            {workflowsItem.icon}
            <span className="flex-1 text-left">{workflowsItem.label}</span>
          </button>
        </div>

        {/* Integrations */}
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Integrations
          </div>
          <button
            onClick={() => handleNavClick(integrationsItem.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(integrationsItem.href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            {integrationsItem.icon}
            <span className="flex-1 text-left">{integrationsItem.label}</span>
          </button>
        </div>

        {/* Knowledge Base */}
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Knowledge Base
          </div>
          <div className="space-y-1">
            {knowledgeBaseItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-xs text-gray-400">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            YK
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-900">
              Yash Krishan
            </div>
            <div className="text-xs text-gray-500">yashkmkrishan@gmail.com</div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
