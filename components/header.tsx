'use client';

import { useState, useRef, useEffect } from 'react';
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from 'next-themes';
import { DarkMode, LightMode, GitHub, Menu, Close } from '@mui/icons-material';
import { useSession, signIn, signOut } from "next-auth/react"

export function Header({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession()

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  useEffect(() => {
    if (menuRef.current) {
      setMenuHeight(isMenuOpen ? menuRef.current.scrollHeight : 0);
    }
  }, [isMenuOpen]);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/repository", label: "Repositories" },
    { href: "/data", label: "GitHub Data" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#F6F8FA] backdrop-blur supports-[backdrop-filter]:bg-[#F6F8FA]/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">GINDER</span>
          </Link>
        </div>

        <nav
          className={cn("hidden md:flex flex-1 items-center justify-center", className)}
          {...props}
        >
          <div className="space-x-4 lg:space-x-6">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon" aria-label="GitHub" asChild>
            <Link
              href="https://github.com/vinishd/ginder"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHub className="h-5 w-5" />
            </Link>
          </Button>
          {status === "authenticated" ? (
            <Button onClick={() => signOut()} variant="outline">
              Sign out
            </Button>
          ) : (
            <Button onClick={() => signIn("github")} variant="outline">
              Sign In
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <LightMode className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <DarkMode className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle menu"
            className="md:hidden"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <Close className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={menuRef}
        style={{ height: `${menuHeight}px` }}
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
      >
        <nav className="flex flex-col items-center space-y-4 py-4">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={toggleMenu}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
};