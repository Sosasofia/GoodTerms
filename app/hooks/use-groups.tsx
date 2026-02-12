"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Group } from "../lib/types";
import { getGroups } from "../lib/api";

export function useGroups() {
    const { user, isLoaded } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshGroups = useCallback(async () => {
        if (!isLoaded) return;

        try {
            setLoading(true);
            const data = await getGroups();
            setGroups(data || []);
        } catch (error) {
            console.error("Failed to fetch groups", error);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id, isLoaded]);

    useEffect(() => {
        refreshGroups();
    }, [refreshGroups]);

    return { groups, loading, refreshGroups };
}
