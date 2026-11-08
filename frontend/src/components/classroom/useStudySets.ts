"use client";

import { useEffect, useState } from "react";
import { readSets, saveSets, seedSets, type StudySet } from "@/lib/study-data";

export function useStudySets() {
  const [sets, setSets] = useState<StudySet[]>(seedSets);
  useEffect(() => {
    const update = () => setSets(readSets());
    update();
    window.addEventListener("studybuddy:sets", update);
    return () => window.removeEventListener("studybuddy:sets", update);
  }, []);
  const updateSets = (next: StudySet[]) => { setSets(next); saveSets(next); };
  return { sets, updateSets };
}
