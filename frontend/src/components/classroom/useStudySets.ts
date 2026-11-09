"use client";

import { useEffect, useState } from "react";
import { readSets, saveSets, seedSets, type StudySet } from "@/lib/study-data";
import { getApiStudySets, isApiSetId, toStudySet } from "@/lib/api/study-sets";

export function useStudySets() {
  const [localSets, setLocalSets] = useState<StudySet[]>(seedSets);
  const [apiSets, setApiSets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  useEffect(() => {
    let active = true;
    const updateLocal = () => setLocalSets(readSets());
    const updateApi = () => getApiStudySets().then((data) => {
      if (active) { setApiSets(data.map(toStudySet)); setApiError(""); }
    }).catch((error) => { if (active) setApiError(error instanceof Error ? error.message : "Unable to load saved sets."); })
      .finally(() => { if (active) setLoading(false); });
    updateLocal();
    updateApi();
    window.addEventListener("studybuddy:sets", updateLocal);
    window.addEventListener("studybuddy:api-sets", updateApi);
    return () => { active = false; window.removeEventListener("studybuddy:sets", updateLocal); window.removeEventListener("studybuddy:api-sets", updateApi); };
  }, []);
  const updateSets = (next: StudySet[]) => { const local = next.filter((set) => !isApiSetId(set.id)); setLocalSets(local); saveSets(local); };
  return { sets: [...apiSets, ...localSets], updateSets, loading, apiError };
}
