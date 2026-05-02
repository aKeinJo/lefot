"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";

interface AppSidebarProps {}

export function AppSidebar({}: AppSidebarProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed: isCollapsed, setSidebarCollapsed } = useUIStore();

  const { projects, isHydrated: isProjectsHydrated } = useProjectStore();
  const sortedProjects = [...projects].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  const { settings, isHydrated: isSettingsHydrated } = useSettingsStore();

  const handleToggle = () => {
    setSidebarCollapsed(!isCollapsed);
  };

  // Provider 설정 확인
  const isProviderConfigured =
    isSettingsHydrated &&
    [
      settings.provider.gemini,
      settings.provider.claude,
      settings.provider.openAI,
      settings.provider.custom.apiKey,
    ].some((key) => key && key.trim() !== "");

  return (
    <aside
      className={cn(
        "flex flex-col bg-lefot-bg h-screen overflow-hidden transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-16 min-w-16" : "w-70 min-w-70",
      )}
    >
      {/* Top Header */}
      <div className="items-center border-lefot-border border-b">
        <div className="flex justify-between m-4 shrink-0">
          <div
            className={cn(
              "flex items-center overflow-hidden transition-[opacity,max-width] duration-200",
              isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
            )}
          >
            <Link
              href="/"
              className="font-semibold text-foreground text-lg whitespace-nowrap"
            >
              Lefot
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={cn("shrink-0", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? (
              <ChevronLastIcon className="w-4 h-4" />
            ) : (
              <ChevronFirstIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Middle Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Controls */}
        <div
          className={cn(
            "flex gap-2 p-4",
            isCollapsed && "flex-col items-center",
          )}
        >
          {isCollapsed ? (
            <>
              <Link href="/new" className="w-full">
                <Button variant="primary" size="icon" className="w-full">
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/new" className="flex-1">
                <Button
                  variant="primary"
                  className="bg-primary w-full text-primary-foreground"
                >
                  <PlusIcon className="w-4 h-4" />
                  New
                </Button>
              </Link>
              <Button disabled size="icon" className="shrink-0">
                <SearchIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Project List */}
        {!isCollapsed && (
          <div className="flex-1 pr-2 pl-4 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
            <div className="flex flex-col gap-2">
              {!isProjectsHydrated ? (
                <div className="p-2 text-lefot-text-secondary text-sm text-center">
                  Loading...
                </div>
              ) : projects.length === 0 ? (
                <div className="p-2 text-lefot-text-secondary text-sm text-center">
                  No projects yet
                </div>
              ) : (
                sortedProjects.map((project) => (
                  <Link
                    href={`/p/${project.id}`}
                    key={project.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2 rounded-md text-left transition-colors cursor-pointer shrink-0",
                      pathname === `/p/${project.id}`
                        ? "bg-foreground/10" // 현재 경로(활성화된 아이템)
                        : "hover:bg-foreground/10",
                    )}
                  >
                    <span className="font-medium text-lefot-text text-sm line-clamp-2">
                      {project.title || "Untitled"}
                    </span>
                    <div className="flex items-center gap-1 text-lefot-text-secondary text-xs">
                      <span className="uppercase">
                        {project.translationStats?.usedLanguage ??
                          project.targetLanguage}
                      </span>
                      |
                      <span className="truncate">
                        {project.translationStats?.usedMainModel ?? "—"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center gap-2 p-2 border-border border-t">
        {isCollapsed ? (
          <Link href="/settings" className="mx-auto">
            <Button
              variant="ghost"
              size="icon"
              className={cn(pathname === "/settings" && "bg-accent")}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </Link>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2 px-2 overflow-hidden">
              {isSettingsHydrated && !isProviderConfigured && (
                <Link
                  href="/settings"
                  className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 truncate transition-colors"
                >
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-xs truncate">
                    API Key Required
                  </span>
                </Link>
              )}
            </div>
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "shrink-0",
                  pathname === "/settings" && "bg-accent",
                )}
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
