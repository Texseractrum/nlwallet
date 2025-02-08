"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Home, Users, LayoutDashboard, MessageSquare, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const chatHistory = [
  { id: 1, title: "BNB Balance Inquiry", date: "2023-05-10" },
  { id: 2, title: "Avalanche Gas Prices", date: "2023-05-11" },
  { id: 3, title: "PancakeSwap Token Swap", date: "2023-05-12" },
]

export function AppSidebar() {
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="relative">
      <Sidebar className={`${isCollapsed ? "w-16" : "w-64"} flex-shrink-0 transition-all duration-300 ease-in-out`}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">Home</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">Dashboard</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/agents">
                      <Users className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">Agents</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {!isCollapsed && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Chat History</SidebarGroupLabel>
                <SidebarGroupContent>
                  <ScrollArea className="h-[200px]">
                    <SidebarMenu>
                      {chatHistory.map((chat) => (
                        <SidebarMenuItem key={chat.id}>
                          <SidebarMenuButton asChild>
                            <Link href={`/chat/${chat.id}`}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              <span>{chat.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </ScrollArea>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Theme</SidebarGroupLabel>
                <SidebarGroupContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-full justify-start"
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    )}
                  </Button>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
      </Sidebar>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-4 z-10"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </div>
  )
}

