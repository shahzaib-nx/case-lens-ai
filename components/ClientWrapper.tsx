"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConfirmProvider } from "./ConfirmProvider";
import { ToastProvider } from "./ToastProvider";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    try {
      localStorage.setItem("__test", "1");
      localStorage.removeItem("__test");
    } catch (e) {
      setStorageError(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!isHydrated) return null; // Avoid hydration mismatch

  return (
    <ToastProvider>
      <ConfirmProvider>
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <img src="/logo.svg" alt="CaseLens AI" width="28" height="28" style={{ borderRadius: '6px' }} />
            CaseLens AI
          </Link>
          <div className="navbar-links hidden md:flex">
            <Link href="/" className={pathname === "/" ? "active" : ""}>Home</Link>
            <Link href="/new-case" className={pathname.startsWith("/new-case") ? "active" : ""}>New Case</Link>
            <Link href="/history" className={pathname.startsWith("/history") ? "active" : ""}>Case History</Link>
            <Link href="/results" className={pathname.startsWith("/results") ? "active" : ""}>Overall Results</Link>
            <Link href="/about" className={pathname.startsWith("/about") ? "active" : ""}>About CaseLens AI</Link>
          </div>
          <button 
            className="md:hidden btn btn-secondary" 
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </nav>

        {/* SM-01 Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(32,33,36,0.6)' }}>
            <div className="w-64 h-full p-6 flex flex-col gap-4 border-l shadow-2xl overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--card-border)' }}>
              <button className="btn btn-secondary self-end mb-4 text-sm px-4 py-2" onClick={() => setMenuOpen(false)}>
                Close &times;
              </button>
              <Link href="/" className="btn btn-secondary w-full text-center justify-center">Home</Link>
              <Link href="/new-case" className="btn btn-primary w-full text-center justify-center">Start New Case</Link>
              <Link href="/history" className="btn btn-secondary w-full text-center justify-center">Case History</Link>
              <Link href="/results" className="btn btn-secondary w-full text-center justify-center">Overall Results</Link>
              <Link href="/about" className="btn btn-secondary w-full text-center justify-center">About CaseLens AI</Link>
              <Link href="/safety" className="btn btn-secondary w-full text-center justify-center">Safety Guidelines</Link>
              <Link href="/privacy" className="btn btn-secondary w-full text-center justify-center">Privacy Policy</Link>
            </div>
          </div>
        )}

        {/* SM-14 Offline Banner */}
        {isOffline && (
          <div style={{ backgroundColor: 'var(--error-bg)', borderBottom: '1px solid var(--error)', padding: '0.75rem', textAlign: 'center', color: 'var(--error)' }}>
            <strong>Offline:</strong> New AI requests are disabled, but saved cases are available.
          </div>
        )}

        {/* SM-15 Storage Error Banner */}
        {storageError && (
          <div style={{ backgroundColor: 'var(--error-bg)', borderBottom: '1px solid var(--error)', padding: '0.75rem', textAlign: 'center', color: 'var(--error)' }}>
            <strong>Error:</strong> Local storage is unavailable. Case history cannot be saved.
          </div>
        )}

        <main>{children}</main>

        <footer className="p-6 text-center text-sm text-gray-400 mt-12" style={{ borderTop: '1px solid var(--card-border)' }}>
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <Link href="/about" className="hover:text-primary">About CaseLens AI</Link>
            <Link href="/safety" className="hover:text-primary">Safety Guidelines</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </div>
          <div style={{ marginTop: '12px' }}>
            &copy; {new Date().getFullYear()} CaseLens AI. Developed by Shahzaib. Educational use only.
          </div>
        </footer>
      </ConfirmProvider>
    </ToastProvider>
  );
}
