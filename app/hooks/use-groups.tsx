"use client";

import { useState, useEffect } from "react";
import { getGroups } from "../lib/api";
import { Group } from "../lib/types";
import { useUser } from "@clerk/nextjs";

export function useGroups() {
    const { user } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshGroups = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getGroups();
            setGroups(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            refreshGroups();
        }
    }, [user]);

    return { groups, refreshGroups, loading };
}
