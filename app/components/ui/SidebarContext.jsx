"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const SidebarContext = createContext(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({ children, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);

      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const cookies = document.cookie.split(";");
    const sidebarCookie = cookies.find((c) =>
      c.trim().startsWith(`${SIDEBAR_COOKIE_NAME}=`)
    );
    if (sidebarCookie) {
      const savedState = sidebarCookie.split("=")[1] === "true";
      setCollapsed(!savedState);
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => {
        const newState = !prev;
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${!newState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        return newState;
      });
    }
  }, [isMobile]);

  const value = {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
