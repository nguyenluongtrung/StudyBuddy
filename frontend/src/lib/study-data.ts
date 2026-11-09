export type Flashcard = { front: string; back: string };
export type QuizQuestion = { question: string; answers: string[]; correct: number; explanation: string };
export type StudySet = {
  id: string;
  title: string;
  subject: string;
  course: string;
  notes: string;
  cards: Flashcard[];
  questions: QuizQuestion[];
  mastery: number;
  updatedAt: string;
  subjectId?: number;
  topic?: string;
  pastedNotes?: string;
  fileName?: string;
  fileDownloadUrl?: string;
  generationStatus?: "pending" | "ready" | "failed" | "outdated";
  generationError?: string;
  generateFlashcards?: boolean;
  generateQuiz?: boolean;
};
export type QuizAnswer = { questionIndex: number; selected: number; seconds: number };
export type QuizResult = { setId: string; answers: QuizAnswer[]; questions: QuizQuestion[]; completedAt: string };

export const seedSets: StudySet[] = [
  {
    id: "synaptic-transmission",
    title: "Synaptic Transmission & Action Potentials",
    subject: "Neuroscience",
    course: "NEUR 201",
    mastery: 80,
    updatedAt: "2026-11-07T10:00:00.000Z",
    notes: "NEUR 201 – Lecture 8: Resting Potentials & Synaptic Discharge\n\n1. Resting membrane potential (RMP) is typically −70 mV in mammalian motor neurons. It is maintained by high intracellular potassium and extracellular sodium, with the Na⁺/K⁺ ATPase pumping 3 Na⁺ out and 2 K⁺ in.\n\n2. Voltage-gated sodium channels open at a threshold of −55 mV, causing a rapid action potential. Delayed rectifier potassium channels then repolarize the membrane.\n\n3. At the synaptic terminal, voltage-gated calcium channels allow Ca²⁺ influx. Calcium triggers vesicle fusion and neurotransmitter release into the synaptic cleft.",
    cards: [
      { front: "What is the typical resting membrane potential of a mammalian motor neuron?", back: "About −70 mV, maintained by ion gradients and the Na⁺/K⁺ ATPase." },
      { front: "What happens when the membrane reaches −55 mV?", back: "Voltage-gated sodium channels open and rapidly depolarize the neuron." },
      { front: "Which ions restore the membrane's negative potential?", back: "Potassium ions (K⁺) leave through delayed rectifier potassium channels." },
      { front: "What triggers the rapid fusion and exocytosis of neurotransmitter-filled synaptic vesicles at the active zone?", back: "Ca²⁺ enters through voltage-gated calcium channels, triggering vesicle fusion and neurotransmitter release." },
      { front: "What does the Na⁺/K⁺ ATPase pump do?", back: "It moves 3 Na⁺ out and 2 K⁺ in to maintain ion gradients." },
      { front: "What is the synaptic cleft?", back: "The small space between the presynaptic and postsynaptic cells." },
    ],
    questions: [
      { question: "What is the typical resting membrane potential of a mammalian motor neuron?", answers: ["+30 mV", "−70 mV", "−10 mV", "+70 mV"], correct: 1, explanation: "The resting membrane potential is approximately −70 mV due to ion gradients across the membrane." },
      { question: "Which channel opens first when a neuron reaches threshold?", answers: ["Voltage-gated Na⁺ channels", "Voltage-gated K⁺ channels", "Ligand-gated Cl⁻ channels", "Calcium pumps"], correct: 0, explanation: "At about −55 mV, voltage-gated sodium channels open and trigger rapid depolarization." },
      { question: "What is the main role of the Na⁺/K⁺ ATPase?", answers: ["Release neurotransmitters", "Create ATP", "Maintain ion gradients", "Open calcium channels"], correct: 2, explanation: "The pump moves 3 Na⁺ out and 2 K⁺ in, helping preserve the resting ion gradients." },
      { question: "During the repolarization phase of an action potential in a mammalian neuron, which specific event is primarily responsible for restoring the negative membrane potential?", answers: ["Rapid influx of chloride ions (Cl⁻) through GABA-A receptor channels", "Efflux of potassium ions (K⁺) through voltage-gated delayed rectifier potassium channels while sodium (Na⁺) channels are inactivated", "Continuous pumping of 3 Na⁺ out and 2 K⁺ in by the sodium-potassium ATPase pump alone", "Direct enzymatic degradation of acetylcholine in the synaptic cleft by acetylcholinesterase"], correct: 1, explanation: "Delayed rectifier potassium channels open in response to depolarization and allow positive K⁺ ions to flow out of the cell, bringing the potential back down toward resting levels." },
      { question: "What is the immediate consequence of blocking voltage-gated calcium channels at the presynaptic axon terminal?", answers: ["Inhibition of action potential propagation along the axon", "Prevention of neurotransmitter release into the synaptic cleft", "Increased potassium efflux", "Faster repolarization"], correct: 1, explanation: "Voltage-gated Ca²⁺ channels open only when the action potential reaches the terminal button. Blocking them halts vesicle exocytosis in the cleft." },
      { question: "Which ion enters the presynaptic terminal to trigger vesicle fusion?", answers: ["Potassium", "Sodium", "Calcium", "Chloride"], correct: 2, explanation: "Calcium influx triggers synaptic vesicles to fuse with the presynaptic membrane." },
      { question: "What is the threshold potential described in the notes?", answers: ["−70 mV", "−55 mV", "+30 mV", "0 mV"], correct: 1, explanation: "The notes identify −55 mV as the threshold for voltage-gated sodium channel opening." },
      { question: "Where are neurotransmitters released?", answers: ["Into the nucleus", "Into the synaptic cleft", "Into the mitochondria", "Into the myelin sheath"], correct: 1, explanation: "Vesicles release their contents into the synaptic cleft between two cells." },
      { question: "How many sodium ions does the Na⁺/K⁺ ATPase move out per cycle?", answers: ["One", "Two", "Three", "Four"], correct: 2, explanation: "Each cycle moves 3 Na⁺ ions out and 2 K⁺ ions in." },
      { question: "Which channels are associated with repolarization?", answers: ["Delayed rectifier K⁺ channels", "Voltage-gated Na⁺ channels", "Ligand-gated Cl⁻ channels", "Calcium pumps"], correct: 0, explanation: "Delayed rectifier potassium channels allow K⁺ to leave the cell and restore the negative potential." },
    ],
  },
  { id: "crispr-repair", title: "CRISPR-Cas9 & DNA Repair Mechanisms", subject: "Molecular Genetics", course: "BIOL 302", mastery: 92, updatedAt: "2026-11-06T10:00:00.000Z", notes: "CRISPR-Cas9 uses a guide RNA to target a DNA sequence. Cas9 creates a double-strand break. Cells repair breaks using non-homologous end joining or homology-directed repair.", cards: [
    { front: "What directs Cas9 to a target DNA sequence?", back: "A guide RNA complementary to the target sequence." },
    { front: "What are two pathways for repairing a double-strand break?", back: "Non-homologous end joining (NHEJ) and homology-directed repair (HDR)." },
  ], questions: [
    { question: "What guides Cas9 to its target?", answers: ["Guide RNA", "DNA ligase", "Ribosome", "ATPase"], correct: 0, explanation: "A guide RNA pairs with the target DNA sequence." },
    { question: "Which repair pathway uses a homologous template?", answers: ["NHEJ", "HDR", "Translation", "Transcription"], correct: 1, explanation: "Homology-directed repair uses a homologous DNA template." },
  ] },
  { id: "reaction-mechanisms", title: "Reaction Mechanisms in Carbonyls & Enolates", subject: "Organic Chemistry", course: "CHEM 220", mastery: 65, updatedAt: "2026-11-05T10:00:00.000Z", notes: "Carbonyl compounds react through nucleophilic addition. Enolates form when a base removes an alpha proton.", cards: [{ front: "What forms when a base removes an alpha proton?", back: "An enolate ion." }], questions: [{ question: "What kind of reaction is common for carbonyls?", answers: ["Nucleophilic addition", "Radical substitution", "Elimination only", "Oxidative phosphorylation"], correct: 0, explanation: "The polarized carbonyl carbon is attacked by nucleophiles." }] },
  { id: "enzyme-kinetics", title: "Enzyme Kinetics, Lineweaver–Burk & Inhibition", subject: "Biochemistry", course: "BIOC 310", mastery: 45, updatedAt: "2026-11-04T10:00:00.000Z", notes: "Michaelis–Menten kinetics describe enzyme reaction rates. Km reflects the substrate concentration at half-maximal velocity.", cards: [{ front: "What does Km represent?", back: "The substrate concentration at half-maximal velocity." }], questions: [{ question: "At what substrate concentration is velocity half of Vmax?", answers: ["Km", "Vmax", "Zero", "Twice Km"], correct: 0, explanation: "Km is the substrate concentration at half of Vmax." }] },
];

const setsKey = "studybuddy.studySets.v1";
const resultKey = "studybuddy.quizResults.v1";
const activeUserKey = "studybuddy.activeUser";
export function readActiveStudyUser() { return typeof window === "undefined" ? "" : localStorage.getItem(activeUserKey) || ""; }
export function setActiveStudyUser(username: string) { if (typeof window === "undefined") return; localStorage.setItem(activeUserKey, username); window.dispatchEvent(new Event("studybuddy:sets")); }
export function clearActiveStudyUser() { if (typeof window === "undefined") return; localStorage.removeItem(activeUserKey); window.dispatchEvent(new Event("studybuddy:sets")); }
function userKey(key: string) { return `${key}.${encodeURIComponent(readActiveStudyUser() || "guest")}`; }

export function readSets(): StudySet[] {
  if (typeof window === "undefined") return seedSets;
  try { const saved = localStorage.getItem(userKey(setsKey)); return saved ? JSON.parse(saved) as StudySet[] : seedSets; } catch { return seedSets; }
}
export function saveSets(sets: StudySet[]) { localStorage.setItem(userKey(setsKey), JSON.stringify(sets)); window.dispatchEvent(new Event("studybuddy:sets")); }
export function saveResult(result: QuizResult) { localStorage.setItem(`${userKey(resultKey)}.${result.setId}`, JSON.stringify(result)); }
export function readResult(setId: string): QuizResult | null {
  if (typeof window === "undefined") return null;
  try { const saved = localStorage.getItem(`${userKey(resultKey)}.${setId}`); return saved ? JSON.parse(saved) as QuizResult : null; } catch { return null; }
}
export function makeCards(notes: string): Flashcard[] {
  const lines = notes.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 24).map((line, index) => {
    const separator = line.indexOf(":");
    const heading = separator > 2 && separator < 70 ? line.slice(0, separator).replace(/^\d+[.)]\s*/, "") : line.split(/[.!?]/)[0].slice(0, 65);
    return { front: `Explain ${heading || `concept ${index + 1}`}.`, back: separator > 2 && separator < 70 ? line.slice(separator + 1).trim() : line };
  });
}
export function makeQuestions(cards: Flashcard[]): QuizQuestion[] {
  return cards.slice(0, 10).map((card, index) => {
    const distractors = cards.filter((_, i) => i !== index).slice(0, 3).map((item) => item.back);
    const correct = index % Math.min(4, distractors.length + 1);
    const answers = [...distractors];
    answers.splice(correct, 0, card.back);
    return { question: card.front, answers, correct, explanation: card.back };
  });
}
