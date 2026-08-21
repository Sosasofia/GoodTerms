"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { GroupModal } from "@/components/group-modal";
import { useGroups } from "@/hooks/use-groups";
import { useDemoGroup } from "@/hooks/use-demo-group";

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { groups, refreshGroups, loading } = useGroups();
  const [modalMode, setModalMode] = useState<"create" | "join" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { demoLoading, handleDemo, isDemoMember } = useDemoGroup(groups, refreshGroups);

  return (
    <div className="flex h-screen flex-col md:flex-row bg-slate-50 overflow-hidden">
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-40 shadow-md">
        <span className="font-bold text-lg tracking-tight">GoodTerms</span>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs h-full bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Close Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="h-full pt-14">
              <Sidebar
                groups={groups}
                loading={loading}
                onOpenModal={(mode) => {
                  setModalMode(mode);
                  setIsMobileMenuOpen(false);
                }}
                onDemo={() => {
                  setIsMobileMenuOpen(false);
                  handleDemo();
                }}
                demoLoading={demoLoading}
                hideDemoButton={isDemoMember}
              />
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-white shrink-0">
        <Sidebar
          groups={groups}
          loading={loading}
          onOpenModal={setModalMode}
          onDemo={handleDemo}
          demoLoading={demoLoading}
          hideDemoButton={isDemoMember}
        />
      </div>

      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 bg-slate-50 relative">
        {children}
      </main>

      {modalMode && (
        <GroupModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onSuccess={() => {
            setModalMode(null);
            refreshGroups();
          }}
        />
      )}
    </div>
  );
}
