"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { Group } from "../lib/types";
import { getGroups } from "../lib/api";

export function useGroups() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshGroups = useCallback(async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);

      let token = null;
      if (isSignedIn) {
        token = await getToken();
      }

      const data = await getGroups(token);

      setGroups(data || []);
    } catch (error) {
      console.error("Failed to fetch groups", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  return { groups, loading, refreshGroups };
}
