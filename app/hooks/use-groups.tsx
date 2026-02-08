"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Group } from "../lib/types";
import { getGroups } from "../lib/api";

export function useGroups() {
    const { user } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshGroups = useCallback(async () => {
        try {
            const data = await getGroups();
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshGroups();
    }, [refreshGroups, user]);

    return { groups, loading, refreshGroups };
}
