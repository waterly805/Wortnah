"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Headphones,
  Heart,
  House,
  Eye,
  EyeOff,
  FolderOpen,
  GripVertical,
  Layers3,
  LockKeyhole,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Mic,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  DEFAULT_ADMIN_CHOICE_MAXIMUM,
  availablePatientChoiceCounts,
  nextPatientChoiceCount,
  normalizePatientChoiceCount,
} from "@/lib/choice-policy";
import type { PatientChoiceCount } from "@/lib/choice-policy";
import { requestPrivateVoiceAudio } from "@/lib/audio-playback";
import { selectNaturalDeviceVoice } from "@/lib/device-voice";
import { buildConcisePageReading } from "@/lib/page-reading";
import { childrenOf, fallbackInternetSearchNodes } from "@/lib/internet-search";
import type { InternetSearchNode } from "@/lib/internet-search";
import { supabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";

type Lang = "de" | "en";
type Role = "user" | "companion";
type PilotProfileKey = "werner" | "admin1" | "admin2";
type View = "welcome" | "login" | "onboarding" | "pin" | "home" | "communicate" | "search" | "practice" | "messages" | "admin" | "settings";
type CommStep = "purpose" | "topic" | "detail" | "review" | "practice" | "priority" | "success";
type Priority = "normal" | "important" | "very_important";
type VoicePreference = "auto" | "female" | "male";
type AdminSection = "overview" | "content" | "practice" | "activity" | "settings";
type ChoiceLevel = "purpose" | "topic" | "detail";
type ContentArea = "communication" | "search";
type AdminContentPath = { level: ChoiceLevel; purposeKey: string; topicKey: string };

const adminContentPathStorageKey = "wortnah:admin-content-path";

function storedAdminContentPath(): AdminContentPath | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(adminContentPathStorageKey) ?? "null") as Partial<AdminContentPath> | null;
    if (!stored || !["purpose", "topic", "detail"].includes(stored.level ?? "")) return null;
    return {
      level: stored.level as ChoiceLevel,
      purposeKey: typeof stored.purposeKey === "string" ? stored.purposeKey : "request",
      topicKey: typeof stored.topicKey === "string" ? stored.topicKey : "",
    };
  } catch {
    return null;
  }
}

type Member = { space_id: string; profile_id: string; role: Role; label: string };
type Choice = { id: string; de: string; en: string; icon?: typeof MessageCircle };
type Receipt = { read_at: string; profile_id: string };
type EmailDelivery = {
  id: string;
  status: "queued" | "processing" | "retrying" | "sent" | "failed";
  attempt_count: number;
  max_attempts: number;
  error_code: string | null;
  sent_at: string | null;
  next_attempt_at: string;
};
type EmailRecipient = {
  id: string;
  email: string;
  enabled: boolean;
  consented_at: string;
  notify_important: boolean;
  notify_very_important: boolean;
};
type SearchHistoryItem = { id: string; text: string; createdAt: string };
type CustomChoice = {
  id: string;
  option_key: string;
  choice_level: ChoiceLevel;
  purpose_key: string | null;
  topic_key: string | null;
  label_de: string;
  label_en: string;
  is_published: boolean;
  practice_eligible: boolean;
  priority: "high" | "medium" | "low";
  sort_order: number;
};
type PracticeItem = {
  id: string;
  source_key: string;
  label_de: string;
  label_en: string;
  difficulty: "easy" | "medium";
  sort_order: number;
};
type ActivityEvent = { id: number; event_type: string; screen_key: string | null; occurred_at: string; profile_id: string; metadata: Record<string, unknown> };

type AppMessage = {
  id: string;
  body_de: string | null;
  body_en: string | null;
  priority: Priority;
  sent_at: string;
  sender_profile_id: string;
  message_receipts?: Receipt[];
  email_notification_deliveries?: EmailDelivery[];
};
type AiBudget = { ai_enabled: boolean; review_mode: "manual_only" | "disabled"; monthly_request_limit: number; monthly_input_token_limit: number; monthly_output_token_limit: number; monthly_cost_limit_cents: number };
type UsageSummary = {
  startedAt: string | null;
  messagesThisWeek: number;
  missingThisWeek: number;
  activeDays: number;
  aiRequests: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiCostCents: number;
  budget: AiBudget;
  dailyActivity: Array<{ label: string; count: number }>;
};

function emailDeliveryLabel(message: AppMessage) {
  if (message.priority === "normal") return "Keine E-Mail – normale Priorität";
  const deliveries = message.email_notification_deliveries;
  if (!deliveries) return null;
  if (!deliveries.length) return "Keine E-Mail – nicht eingeschaltet";
  if (deliveries.some((delivery) => delivery.status === "failed")) return "E-Mail fehlgeschlagen";
  if (deliveries.every((delivery) => delivery.status === "sent")) return "E-Mail gesendet";
  return "E-Mail wird erneut versucht";
}

const purposeIds: Record<string, string> = {
  tell: "10000000-0000-4000-8000-000000000001",
  request: "10000000-0000-4000-8000-000000000002",
  ask: "10000000-0000-4000-8000-000000000003",
  discuss: "10000000-0000-4000-8000-000000000004",
};

const topicIds: Record<string, string> = {
  my_day: "20000000-0000-4000-8000-000000000001",
  family_people: "20000000-0000-4000-8000-000000000002",
  how_i_feel: "20000000-0000-4000-8000-000000000003",
  health_appointments: "20000000-0000-4000-8000-000000000004",
  house_repairs: "20000000-0000-4000-8000-000000000005",
};

const purposes: Choice[] = [
  { id: "tell", de: "Ich möchte etwas erzählen", en: "I want to tell something", icon: MessageCircle },
  { id: "request", de: "Ich möchte um etwas bitten", en: "I want to request something", icon: Heart },
  { id: "ask", de: "Ich habe eine Frage", en: "I have a question", icon: CircleHelp },
  { id: "reply", de: "Ich möchte kurz antworten", en: "I want to give a short answer", icon: Check },
  { id: "express", de: "Ich möchte sagen, wie es mir geht", en: "I want to say how I feel", icon: Heart },
  { id: "discuss", de: "Ich möchte über etwas sprechen", en: "I want to discuss something", icon: MessagesSquare },
];

const topicsByPurpose: Record<string, Choice[]> = {
  tell: [
    { id: "my_day", de: "Mein Tag", en: "My day", icon: Sun },
    { id: "family_people", de: "Familie und Menschen", en: "Family and people", icon: Users },
    { id: "how_i_feel", de: "Wie ich mich fühle", en: "How I feel", icon: Heart },
    { id: "health_appointments", de: "Gesundheit und Termine", en: "Health and appointments", icon: ClipboardCheck },
  ],
  request: [
    { id: "house_repairs", de: "Haus und Reparaturen", en: "House and repairs", icon: Wrench },
    { id: "health_appointments", de: "Termine", en: "Appointments", icon: ClipboardCheck },
    { id: "my_day", de: "Hilfe im Alltag", en: "Everyday help", icon: Sun },
    { id: "family_people", de: "Familie und Menschen", en: "Family and people", icon: Users },
  ],
  ask: [
    { id: "family_people", de: "Familie und Menschen", en: "Family and people", icon: Users },
    { id: "my_day", de: "Pläne und Aktivitäten", en: "Plans and activities", icon: Sun },
    { id: "health_appointments", de: "Gesundheit und Termine", en: "Health and appointments", icon: ClipboardCheck },
    { id: "house_repairs", de: "Haus und Dokumente", en: "Home and documents", icon: House },
  ],
  discuss: [
    { id: "how_i_feel", de: "Wie ich mich fühle", en: "How I feel", icon: Heart },
    { id: "family_people", de: "Familie und Menschen", en: "Family and people", icon: Users },
    { id: "my_day", de: "Aktivitäten und Pläne", en: "Activities and plans", icon: Sun },
    { id: "health_appointments", de: "Gesundheit", en: "Health", icon: ClipboardCheck },
  ],
};

const details: Record<string, Choice[]> = {
  "tell:my_day": [
    { id: "good_day", de: "Heute war ein guter Tag.", en: "Today was a good day." },
    { id: "outside", de: "Ich war heute draußen.", en: "I was outside today." },
    { id: "visit", de: "Ich hatte heute Besuch.", en: "I had a visitor today." },
    { id: "tell_more", de: "Ich möchte von meinem Tag erzählen.", en: "I want to tell you about my day." },
  ],
  "tell:family_people": [
    { id: "family_good", de: "Ich habe mich über den Familienbesuch gefreut.", en: "I was happy about the family visit." },
    { id: "call", de: "Ich habe heute mit der Familie gesprochen.", en: "I spoke with family today." },
    { id: "miss", de: "Ich vermisse jemanden aus der Familie.", en: "I miss someone in the family." },
    { id: "news", de: "Ich möchte etwas über die Familie erzählen.", en: "I want to share something about the family." },
  ],
  "tell:how_i_feel": [
    { id: "well", de: "Mir geht es heute gut.", en: "I feel well today." },
    { id: "tired", de: "Ich bin heute müde.", en: "I am tired today." },
    { id: "calm", de: "Ich fühle mich ruhig.", en: "I feel calm." },
    { id: "unwell", de: "Mir geht es heute nicht gut.", en: "I do not feel well today." },
  ],
  "tell:health_appointments": [
    { id: "appointment_good", de: "Der Termin ist gut gelaufen.", en: "The appointment went well." },
    { id: "pain", de: "Ich habe heute Schmerzen.", en: "I am in pain today." },
    { id: "better", de: "Heute geht es mir besser.", en: "I feel better today." },
    { id: "health_tell", de: "Ich möchte etwas über meine Gesundheit erzählen.", en: "I want to say something about my health." },
  ],
  "request:house_repairs": [
    { id: "repair", de: "Bitte hilf mir bei einer Reparatur.", en: "Please help me with a repair." },
    { id: "light", de: "Bitte prüfe das Licht.", en: "Please check the light." },
    { id: "door", de: "Bitte hilf mir mit der Tür.", en: "Please help me with the door." },
    { id: "house_help", de: "Ich brauche Hilfe im Haus.", en: "I need help in the house." },
  ],
  "request:health_appointments": [
    { id: "make_appointment", de: "Bitte hilf mir, einen Termin zu machen.", en: "Please help me make an appointment." },
    { id: "medicine", de: "Bitte hilf mir mit meinen Medikamenten.", en: "Please help me with my medication." },
    { id: "doctor", de: "Bitte ruf die Arztpraxis an.", en: "Please call the doctor’s office." },
    { id: "calendar", de: "Bitte zeig mir meine Termine.", en: "Please show me my appointments." },
  ],
  "request:my_day": [
    { id: "drink", de: "Bitte bring mir etwas zu trinken.", en: "Please bring me something to drink." },
    { id: "break", de: "Ich brauche bitte eine Pause.", en: "I need a break, please." },
    { id: "outside_help", de: "Bitte geh mit mir nach draußen.", en: "Please go outside with me." },
    { id: "daily_help", de: "Bitte hilf mir im Alltag.", en: "Please help me with an everyday task." },
  ],
  "request:family_people": [
    { id: "call_family", de: "Bitte ruf jemanden aus der Familie an.", en: "Please call someone in the family." },
    { id: "visit_family", de: "Bitte plane einen Familienbesuch.", en: "Please plan a family visit." },
    { id: "photo", de: "Bitte zeig mir die Familienfotos.", en: "Please show me the family photos." },
    { id: "contact", de: "Bitte hilf mir, jemanden zu erreichen.", en: "Please help me contact someone." },
  ],
  "ask:family_people": [
    { id: "who_visit", de: "Wer kommt heute zu Besuch?", en: "Who is visiting today?" },
    { id: "how_family", de: "Wie geht es der Familie?", en: "How is the family?" },
    { id: "call_when", de: "Wann können wir die Familie anrufen?", en: "When can we call the family?" },
    { id: "where", de: "Wo ist meine Familie heute?", en: "Where is my family today?" },
  ],
  "ask:my_day": [
    { id: "today", de: "Was machen wir heute?", en: "What are we doing today?" },
    { id: "time", de: "Wann gehen wir los?", en: "When are we leaving?" },
    { id: "weather", de: "Wie ist das Wetter heute?", en: "What is the weather like today?" },
    { id: "after", de: "Was machen wir danach?", en: "What are we doing after that?" },
  ],
  "ask:health_appointments": [
    { id: "next_appointment", de: "Wann ist mein nächster Termin?", en: "When is my next appointment?" },
    { id: "medicine_when", de: "Wann nehme ich meine Medikamente?", en: "When do I take my medication?" },
    { id: "doctor_name", de: "Bei welcher Ärztin oder welchem Arzt ist der Termin?", en: "Which doctor is the appointment with?" },
    { id: "appointment_place", de: "Wo ist der Termin?", en: "Where is the appointment?" },
  ],
  "ask:house_repairs": [
    { id: "document", de: "Wo ist das Dokument?", en: "Where is the document?" },
    { id: "repair_when", de: "Wann wird das repariert?", en: "When will this be repaired?" },
    { id: "bill", de: "Ist diese Rechnung schon bezahlt?", en: "Has this bill been paid?" },
    { id: "key", de: "Wo ist der Schlüssel?", en: "Where is the key?" },
  ],
  "discuss:how_i_feel": [
    { id: "concerned", de: "Ich möchte über eine Sorge sprechen.", en: "I want to talk about a concern." },
    { id: "happy", de: "Ich möchte über etwas Schönes sprechen.", en: "I want to talk about something good." },
    { id: "tired_discuss", de: "Ich möchte darüber sprechen, dass ich müde bin.", en: "I want to talk about feeling tired." },
    { id: "feelings", de: "Ich möchte über meine Gefühle sprechen.", en: "I want to talk about my feelings." },
  ],
  "discuss:family_people": [
    { id: "family_plan", de: "Ich möchte über unsere Familie sprechen.", en: "I want to talk about our family." },
    { id: "visit_plan", de: "Ich möchte einen Besuch besprechen.", en: "I want to discuss a visit." },
    { id: "person", de: "Ich möchte über eine Person sprechen.", en: "I want to talk about someone." },
    { id: "call_plan", de: "Ich möchte einen Anruf planen.", en: "I want to plan a phone call." },
  ],
  "discuss:my_day": [
    { id: "tomorrow", de: "Ich möchte den morgigen Tag planen.", en: "I want to plan tomorrow." },
    { id: "weekend", de: "Ich möchte über das Wochenende sprechen.", en: "I want to talk about the weekend." },
    { id: "activity", de: "Ich möchte eine Aktivität planen.", en: "I want to plan an activity." },
    { id: "change_plan", de: "Ich möchte einen Plan ändern.", en: "I want to change a plan." },
  ],
  "discuss:health_appointments": [
    { id: "health_concern", de: "Ich möchte über meine Gesundheit sprechen.", en: "I want to talk about my health." },
    { id: "appointment_discuss", de: "Ich möchte meinen Termin besprechen.", en: "I want to discuss my appointment." },
    { id: "therapy", de: "Ich möchte über das Üben sprechen.", en: "I want to talk about practice." },
    { id: "rest", de: "Ich möchte über Ruhe und Pausen sprechen.", en: "I want to talk about rest and breaks." },
  ],
};


function searchNodeIcon(node: InternetSearchNode): typeof MessageCircle {
  if (/weather|temperature|rain/.test(node.option_key)) return Sun;
  if (/news|television/.test(node.option_key)) return Bell;
  if (/health|doctor|pharmacy/.test(node.option_key)) return Heart;
  if (/travel|route|transport|bus|train|place|business/.test(node.option_key)) return House;
  if (/media|watch|video/.test(node.option_key)) return Mic;
  if (/music|radio|listen/.test(node.option_key)) return Headphones;
  if (/food|cook|recipe|language|translate|meaning/.test(node.option_key)) return BookOpen;
  if (/help|result|search/.test(node.option_key)) return Search;
  return MessageCircle;
}

const copy = {
  de: {
    tagline: "Sagen, was wichtig ist.", chooseArea: "Wählen Sie Ihren Bereich", user: "Mein Bereich", companion: "Begleitung",
    userHint: "Kommunizieren, üben und Mitteilungen lesen", companionHint: "Mitteilungen, Einstellungen und Nutzung",
    demo: "Demo ansehen", demoNote: "Die Demo speichert keine persönlichen Daten.", connect: "Gerät sicher verbinden",
    signIn: "Anmelden", signUp: "Neu einrichten", email: "E-Mail", password: "Sicheres Passwort", continue: "Weiter",
    checkEmail: "Bitte öffnen Sie den Bestätigungslink in Ihrer E-Mail. Danach können Sie sich anmelden.", invite: "Einladungscode",
    inviteHint: "Begleitung erstellt diesen achtstelligen Code.", setupCompanion: "Bereich als Begleitung einrichten",
    setPin: "Vierstellige PIN festlegen", enterPin: "PIN eingeben", pinHint: "Diese PIN öffnet Wortnah auf diesem Gerät.",
    forgotPin: "PIN vergessen? Sicher neu anmelden", wrongPin: "Die PIN stimmt nicht. Bitte versuchen Sie es noch einmal.",
    communicate: "Kommunizieren", search: "Internet suchen", practice: "Üben", messages: "Mitteilungen", settings: "Meine Einstellungen",
    whatDo: "Was möchten Sie tun?", audioOn: "Ton an", audioOff: "Ton aus", back: "Zurück", repeat: "Noch einmal",
    choosePurpose: "Was möchten Sie sagen?", chooseTopic: "Worum geht es?", chooseDetail: "Wählen Sie den passenden Satz.",
    firstTap: "Einmal antippen zum Anhören. Noch einmal antippen zum Auswählen.", missingTopic: "Hier fehlt etwas", whatMissing: "Was fehlt hier?",
    review: "Ihre Nachricht", listen: "Anhören", change: "Ändern", send: "Senden", choosePriority: "Wie wichtig ist die Nachricht?",
    normal: "Normal", important: "Wichtig", veryImportant: "Sehr wichtig", sendNow: "Nachricht senden", sent: "Nachricht gesendet",
    sentHint: "Begleitung kann die Nachricht jetzt lesen.", home: "Zur Startseite", delivery: "Gesendet", read: "Gelesen",
    noMessages: "Noch keine Mitteilungen.", markRead: "Als gelesen markieren", practiceTitle: "Hören und Nachsprechen",
    practiceHint: "Hören Sie den Satz. Sprechen Sie ihn laut nach.", done: "Fertig", next: "Weiter", dashboard: "Übersicht",
    inviteUser: "Mein Bereich verbinden", createCode: "Einladungscode erstellen", codeValid: "Der Code ist 30 Minuten gültig.",
    kpiMessages: "Gesendete Mitteilungen", kpiRead: "Gelesen", kpiImportant: "Wichtig", recommendations: "Empfehlungen",
    noRecommendations: "Noch keine Empfehlungen. Dafür braucht Wortnah zuerst echte Nutzung.", appearance: "Anzeige",
    choices: "Auswahlmöglichkeiten", textSize: "Textgröße", standard: "Standard", large: "Groß", larger: "Sehr groß",
    voice: "Deutsche Stimme", voiceAuto: "Automatisch", voiceFemale: "Weiblich", voiceMale: "Männlich", voiceTest: "Stimme testen",
    speechSpeed: "Sprechtempo", slow: "Langsam", clear: "Ruhig", normalSpeed: "Normal", missingReports: "Etwas-fehlt-Meldungen",
    aiController: "KI-Kostenkontrolle", aiLocked: "KI ist gesperrt", aiManualOnly: "Nur nach Ihrer Freigabe", aiUsage: "KI-Nutzung", usageOverTime: "Nutzung im Zeitverlauf", activeDays: "Aktive Tage", messagesWeek: "Nachrichten diese Woche",
    account: "Konto", signOut: "Abmelden", saveError: "Das hat nicht geklappt. Bitte versuchen Sie es erneut.",
    online: "Verbunden", offline: "Offline – Ihre aktuelle Auswahl bleibt erhalten", secure: "Privat und geschützt",
    demoMode: "Demo", liveMode: "Live", install: "Im Browser und als App nutzbar", enrollStrong: "Nur bei der ersten Einrichtung nötig.",
  },
  en: {
    tagline: "Say what matters.", chooseArea: "Choose your area", user: "My Space", companion: "Support",
    userHint: "Communicate, practice and read messages", companionHint: "Messages, settings and usage",
    demo: "View demo", demoNote: "The demo does not save personal data.", connect: "Connect this device securely",
    signIn: "Sign in", signUp: "Set up new", email: "Email", password: "Secure password", continue: "Continue",
    checkEmail: "Open the confirmation link in your email. Then you can sign in.", invite: "Invitation code",
    inviteHint: "Support creates this eight-character code.", setupCompanion: "Set up the Support space",
    setPin: "Set a four-digit PIN", enterPin: "Enter PIN", pinHint: "This PIN opens Wortnah on this device.",
    forgotPin: "Forgot PIN? Sign in securely again", wrongPin: "That PIN is not correct. Please try again.",
    communicate: "Communicate", search: "Search the internet", practice: "Practice", messages: "Messages", settings: "My settings",
    whatDo: "What would you like to do?", audioOn: "Sound on", audioOff: "Sound off", back: "Back", repeat: "Repeat",
    choosePurpose: "What would you like to say?", chooseTopic: "What is it about?", chooseDetail: "Choose the sentence that fits.",
    firstTap: "Tap once to hear it. Tap the same choice again to select it.", missingTopic: "Something is missing", whatMissing: "What is missing here?",
    review: "Your message", listen: "Listen", change: "Change", send: "Send", choosePriority: "How important is the message?",
    normal: "Normal", important: "Important", veryImportant: "Very important", sendNow: "Send message", sent: "Message sent",
    sentHint: "Support can now read the message.", home: "Back to home", delivery: "Sent", read: "Read",
    noMessages: "No messages yet.", markRead: "Mark as read", practiceTitle: "Listen and repeat",
    practiceHint: "Listen to the sentence. Say it aloud.", done: "Done", next: "Next", dashboard: "Overview",
    inviteUser: "Connect My Space", createCode: "Create invitation code", codeValid: "The code is valid for 30 minutes.",
    kpiMessages: "Messages sent", kpiRead: "Read", kpiImportant: "Important", recommendations: "Recommendations",
    noRecommendations: "No recommendations yet. Wortnah first needs real usage.", appearance: "Display",
    choices: "Choices", textSize: "Text size", standard: "Standard", large: "Large", larger: "Very large",
    voice: "German voice", voiceAuto: "Automatic", voiceFemale: "Female", voiceMale: "Male", voiceTest: "Test voice",
    speechSpeed: "Speaking speed", slow: "Slow", clear: "Calm", normalSpeed: "Normal", missingReports: "Missing-option reports",
    aiController: "AI cost control", aiLocked: "AI is locked", aiManualOnly: "Only after your approval", aiUsage: "AI usage", usageOverTime: "Usage over time", activeDays: "Active days", messagesWeek: "Messages this week",
    account: "Account", signOut: "Sign out", saveError: "That did not work. Please try again.",
    online: "Connected", offline: "Offline – your current choice is preserved", secure: "Private and protected",
    demoMode: "Demo", liveMode: "Live", install: "Works in the browser and as an app", enrollStrong: "Only needed for first-time setup.",
  },
} as const;

function getDetails(purpose: string, topic: string): Choice[] {
  return details[`${purpose}:${topic}`] ?? details[`${purpose}:my_day`] ?? details["tell:my_day"];
}

function Logo() {
  return <span className="wordmark"><Image className="wordmark-logo" src="/wortnah-logo-round.png" width={64} height={64} alt="" aria-hidden="true" priority /><span>Wortnah</span></span>;
}

function PinPad({ title, hint, stepLabel, submitLabel, cancelLabel, error, busy = false, busyLabel, onComplete, onBack, onInput }: { title: string; hint: string; stepLabel?: string; submitLabel: string; cancelLabel: string; error?: string; busy?: boolean; busyLabel: string; onComplete: (pin: string) => void; onBack: () => void; onInput?: () => void }) {
  const [pin, setPin] = useState("");
  const updatePin = (next: string) => {
    if (busy) return;
    if (next !== pin) onInput?.();
    setPin(next.replace(/\D/g, "").slice(0, 4));
  };
  const add = (digit: string) => {
    if (pin.length >= 4) return;
    updatePin(pin + digit);
  };
  return (
    <div className="centered-panel" aria-busy={busy}>
      <form className="pin-card" onSubmit={(event) => { event.preventDefault(); if (pin.length === 4 && !busy) { const submittedPin = pin; setPin(""); onComplete(submittedPin); } }}>
        <div className="pin-icon"><LockKeyhole /></div>
        {stepLabel && <span className="pin-step">{stepLabel}</span>}
        <h1>{title}</h1><p>{hint}</p>
        <InputOTP maxLength={4} value={pin} onChange={updatePin} disabled={busy} inputMode="numeric" aria-label={title} autoFocus>
          <InputOTPGroup className="otp-group">
            {[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} className="otp-slot" />)}
          </InputOTPGroup>
        </InputOTP>
        {error && <p className="form-error" role="alert">{error}</p>}
        {busy && <p className="pin-busy" role="status">{busyLabel}</p>}
        <div className="keypad" aria-label="Ziffernblock">
          {["1","2","3","4","5","6","7","8","9"].map((digit) => <button type="button" key={digit} onClick={() => add(digit)} disabled={busy}>{digit}</button>)}
          <button type="button" aria-label="PIN löschen" onClick={() => updatePin("")} disabled={busy}><RotateCcw /></button>
          <button type="button" onClick={() => add("0")} disabled={busy}>0</button>
          <button type="button" aria-label="Letzte Ziffer löschen" onClick={() => updatePin(pin.slice(0, -1))} disabled={busy}>⌫</button>
        </div>
        <div className="pin-actions"><button type="button" className="pin-cancel" onClick={onBack} disabled={busy}><ArrowLeft />{cancelLabel}</button><button type="submit" className="primary-button" disabled={pin.length !== 4 || busy}>{busy ? busyLabel : submitLabel}<ChevronRight /></button></div>
      </form>
    </div>
  );
}

function ChoiceGrid({ choices, lang, selected, speaking, onChoose, onVisibleChoicesChange, count = 4 }: { choices: Choice[]; lang: Lang; selected: string | null; speaking: string | null; onChoose: (choice: Choice) => void; onVisibleChoicesChange?: (choices: Choice[]) => void; count?: number }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(choices.length / count));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * count;
  const visibleChoices = choices.slice(start, start + count);
  useEffect(() => {
    onVisibleChoicesChange?.(choices.slice(start, start + count));
  }, [choices, count, onVisibleChoicesChange, start]);
  return (
    <div className="choice-carousel">
      <div className={`choice-grid choice-count-${Math.min(count, visibleChoices.length)}`}>
        {visibleChoices.map((choice, index) => {
          const Icon = choice.icon;
          const active = selected === choice.id;
          return (
            <button key={choice.id} className={`choice-card ${active ? "selected" : ""} ${speaking === choice.id ? "speaking" : ""}`} onClick={() => onChoose(choice)} aria-pressed={active}>
              <span className="choice-number">{start + index + 1}</span>
              {Icon && <span className="choice-icon"><Icon /></span>}
              <span>{choice[lang]}</span>
              {active && <span className="choice-confirm"><Check /> {lang === "de" ? "Noch einmal" : "Tap again"}</span>}
            </button>
          );
        })}
      </div>
      {pageCount > 1 && <nav className="choice-pagination" aria-label={lang === "de" ? "Seiten" : "Pages"}>
        <button className="choice-page-arrow" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={safePage === 0} aria-label={lang === "de" ? "Vorherige Seite" : "Previous page"}><ChevronLeft /></button>
        <div className="choice-page-status"><div>{Array.from({ length: pageCount }, (_, index) => <button key={index} className={safePage === index ? "active" : ""} onClick={() => setPage(index)} aria-label={`${lang === "de" ? "Seite" : "Page"} ${index + 1}`} aria-current={safePage === index ? "page" : undefined} />)}</div><span>{lang === "de" ? "Seite" : "Page"} {safePage + 1} {lang === "de" ? "von" : "of"} {pageCount}</span></div>
        <button className="choice-page-arrow" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={safePage === pageCount - 1} aria-label={lang === "de" ? "Nächste Seite" : "Next page"}><ChevronRight /></button>
      </nav>}
    </div>
  );
}

function PatientBottomBar({ audioMode, audioModeLabel, onBack, onRepeat, onToggleAudio }: { audioMode: "off" | "slow" | "on"; audioModeLabel: string; onBack: () => void; onRepeat: () => void; onToggleAudio: () => void }) {
  return (
    <nav className="bottom-nav patient-bottom-nav" aria-label="Schnellnavigation">
      <button onClick={onBack} aria-label="Zurück"><ArrowLeft /><span>Zurück</span></button>
      <button onClick={onRepeat} aria-label="Noch einmal"><RotateCcw /><span>Noch einmal</span></button>
      <button onClick={onToggleAudio} aria-label={audioModeLabel}>{audioMode === "off" ? <VolumeX /> : <Volume2 />}<span>{audioModeLabel}</span></button>
    </nav>
  );
}

export function WortnahApp() {
  const lang: Lang = "de";
  const t = copy[lang];
  const [view, setView] = useState<View>("welcome");
  const [role, setRole] = useState<Role | null>(null);
  const [desiredRole, setDesiredRole] = useState<Role>("user");
  const [pilotProfile, setPilotProfile] = useState<PilotProfileKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [booting, setBooting] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pinMode, setPinMode] = useState<"create" | "unlock">("unlock");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoReadChoices, setAutoReadChoices] = useState(true);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [adminChoiceMaximum, setAdminChoiceMaximum] = useState(DEFAULT_ADMIN_CHOICE_MAXIMUM);
  const allowedChoiceCounts = availablePatientChoiceCounts(adminChoiceMaximum);
  const [choiceCount, setChoiceCount] = useState(() => normalizePatientChoiceCount(8, adminChoiceMaximum));
  const [textScale, setTextScale] = useState(1);
  const [speechRate, setSpeechRate] = useState(0.82);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>("auto");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const remoteAudioUrl = useRef<string | null>(null);
  const privateAudioCache = useRef(new Map<string, Blob>());
  const speechSequenceId = useRef(0);
  const lastAutoReadKey = useRef("");
  const [visiblePageChoices, setVisiblePageChoices] = useState<Choice[]>([]);
  const reportVisibleChoices = useCallback((choices: Choice[]) => {
    setVisiblePageChoices((current) => current.map((choice) => `${choice.id}:${choice.de}:${choice.en}`).join("|") === choices.map((choice) => `${choice.id}:${choice.de}:${choice.en}`).join("|") ? current : choices);
  }, []);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("wortnah:search-history");
      return stored ? JSON.parse(stored) as SearchHistoryItem[] : [];
    } catch { return []; }
  });
  const [searchNodes, setSearchNodes] = useState<InternetSearchNode[]>(fallbackInternetSearchNodes);
  const [searchPath, setSearchPath] = useState<InternetSearchNode[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<string | null>(null);
  const [showMissingChoices, setShowMissingChoices] = useState(false);
  const [customPurposes, setCustomPurposes] = useState<CustomChoice[]>([]);
  const [customTopics, setCustomTopics] = useState<CustomChoice[]>([]);
  const [customDetails, setCustomDetails] = useState<CustomChoice[]>([]);
  const [loadedChoiceLevels, setLoadedChoiceLevels] = useState<Record<ChoiceLevel, boolean>>({ purpose: false, topic: false, detail: false });
  const [patientChoicesLoading, setPatientChoicesLoading] = useState(false);
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [contentArea, setContentArea] = useState<ContentArea>("communication");
  const [contentLevel, setContentLevel] = useState<ChoiceLevel>(() => storedAdminContentPath()?.level ?? "topic");
  const [contentSearch, setContentSearch] = useState("");
  const [adminChoices, setAdminChoices] = useState<CustomChoice[]>([]);
  const [adminPurposeOptions, setAdminPurposeOptions] = useState<CustomChoice[]>([]);
  const [adminTopicOptions, setAdminTopicOptions] = useState<CustomChoice[]>([]);
  const [selectedAdminPurposeKey, setSelectedAdminPurposeKey] = useState(() => storedAdminContentPath()?.purposeKey ?? "request");
  const [selectedAdminTopicKey, setSelectedAdminTopicKey] = useState(() => storedAdminContentPath()?.topicKey ?? "");
  const [contentLoading, setContentLoading] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorNotice, setEditorNotice] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [editingChoice, setEditingChoice] = useState<CustomChoice | null>(null);
  const [creatingChoice, setCreatingChoice] = useState(false);
  const [choiceDraft, setChoiceDraft] = useState({ label_de: "", label_en: "", purpose_key: "request", topic_key: "", priority: "medium" as CustomChoice["priority"], practice_eligible: false, is_published: true, sort_order: 1000 });
  const [adminSearchLevel, setAdminSearchLevel] = useState<1 | 2 | 3 | 4>(1);
  const [adminSearchNodes, setAdminSearchNodes] = useState<InternetSearchNode[]>(fallbackInternetSearchNodes);
  const [adminSearchText, setAdminSearchText] = useState("");
  const [editingSearchNode, setEditingSearchNode] = useState<InternetSearchNode | null>(null);
  const [creatingSearchNode, setCreatingSearchNode] = useState(false);
  const [searchDraft, setSearchDraft] = useState({ label_de: "", label_en: "", parent_key: "", query_de: "", query_en: "", is_published: true, sort_order: 1000 });
  const [editingPractice, setEditingPractice] = useState<PracticeItem | null>(null);
  const [creatingPractice, setCreatingPractice] = useState(false);
  const [practiceDraft, setPracticeDraft] = useState({ label_de: "", label_en: "", difficulty: "easy" as PracticeItem["difficulty"], sort_order: 1000 });
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({
    startedAt: null, messagesThisWeek: 0, missingThisWeek: 0, activeDays: 0,
    aiRequests: 0, aiInputTokens: 0, aiOutputTokens: 0, aiCostCents: 0,
    budget: { ai_enabled: false, review_mode: "manual_only", monthly_request_limit: 0, monthly_input_token_limit: 0, monthly_output_token_limit: 0, monthly_cost_limit_cents: 0 },
    dailyActivity: [],
  });
  const [commStep, setCommStep] = useState<CommStep>("purpose");
  const [purpose, setPurpose] = useState<Choice | null>(null);
  const [topic, setTopic] = useState<Choice | null>(null);
  const [detail, setDetail] = useState<Choice | null>(null);
  const [priority, setPriority] = useState<Priority>("normal");
  const [messageSending, setMessageSending] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [emailRecipientDraft, setEmailRecipientDraft] = useState("");
  const [emailRecipientConsent, setEmailRecipientConsent] = useState(false);
  const [emailSettingsBusy, setEmailSettingsBusy] = useState(false);
  const [emailSettingsNotice, setEmailSettingsNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const lastTrackedScreen = useRef("");

  const getMembership = useCallback(async (userId: string, preferredSpaceId?: string | null) => {
    let query = supabase
      .from("space_members")
      .select("space_id,profile_id,role,label")
      .eq("profile_id", userId)
      .eq("is_active", true);
    if (preferredSpaceId) query = query.eq("space_id", preferredSpaceId);
    else query = query.order("joined_at", { ascending: false });
    const { data } = await query.limit(1).maybeSingle();
    if (!data) return null;
    return data as Member;
  }, []);

  const loadMessages = useCallback(async (activeMember: Member | null = member) => {
    if (!activeMember || demo) return;
    const messageSelect = activeMember.role === "companion"
      ? "id,body_de,body_en,priority,sent_at,sender_profile_id,message_receipts(profile_id,read_at),email_notification_deliveries(id,status,attempt_count,max_attempts,error_code,sent_at,next_attempt_at)"
      : "id,body_de,body_en,priority,sent_at,sender_profile_id,message_receipts(profile_id,read_at)";
    const { data } = await supabase.from("messages").select(messageSelect).eq("space_id", activeMember.space_id).is("archived_at", null).order("sent_at", { ascending: false }).limit(50);
    if (data) setMessages(data as AppMessage[]);
  }, [demo, member]);

  const loadPatientChoices = useCallback(async (level: ChoiceLevel, purposeKey?: string, topicKey?: string) => {
    if (!member || demo) return [] as CustomChoice[];
    let query = supabase
      .from("communication_custom_choices")
      .select("id,option_key,choice_level,purpose_key,topic_key,label_de,label_en,is_published,practice_eligible,priority,sort_order")
      .eq("space_id", member.space_id)
      .eq("choice_level", level)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(120);
    if (purposeKey) query = query.eq("purpose_key", purposeKey);
    if (topicKey) query = query.eq("topic_key", topicKey);
    const { data, error: loadError } = await query;
    if (loadError) return null;
    return (data ?? []) as CustomChoice[];
  }, [demo, member]);

  const applyPatientChoices = useCallback((level: ChoiceLevel, choices: CustomChoice[] | null) => {
    if (choices === null) return;
    if (level === "purpose") setCustomPurposes(choices);
    else if (level === "topic") setCustomTopics(choices);
    else setCustomDetails(choices);
    setLoadedChoiceLevels((current) => ({ ...current, [level]: true }));
  }, []);

  const loadPracticeItems = useCallback(async () => {
    if (!member || demo) return;
    const { data } = await supabase
      .from("communication_practice_items")
      .select("id,source_key,label_de,label_en,difficulty,sort_order")
      .eq("space_id", member.space_id)
      .order("sort_order", { ascending: true })
      .limit(200);
    if (data) setPracticeItems(data as PracticeItem[]);
  }, [demo, member]);

  const loadSearchNodes = useCallback(async () => {
    if (!member || demo) return;
    const { data, error: searchError } = await supabase
      .from("internet_search_choices")
      .select("id,option_key,parent_key,search_level,label_de,label_en,query_de,query_en,is_published,sort_order")
      .eq("space_id", member.space_id)
      .eq("is_published", true)
      .order("search_level", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(300);
    if (!searchError && data?.length) setSearchNodes(data as InternetSearchNode[]);
  }, [demo, member]);

  const loadAdminChoices = useCallback(async () => {
    if (!member || demo || role !== "companion") return;
    if ((contentLevel === "topic" && !selectedAdminPurposeKey) || (contentLevel === "detail" && (!selectedAdminPurposeKey || !selectedAdminTopicKey))) {
      setAdminChoices([]);
      setContentLoading(false);
      return;
    }
    setContentLoading(true);
    let query = supabase
      .from("communication_custom_choices")
      .select("id,option_key,choice_level,purpose_key,topic_key,label_de,label_en,is_published,practice_eligible,priority,sort_order")
      .eq("space_id", member.space_id)
      .eq("choice_level", contentLevel)
      .order("sort_order", { ascending: true })
      .limit(240);
    if (contentLevel === "topic") query = query.eq("purpose_key", selectedAdminPurposeKey);
    if (contentLevel === "detail") query = query.eq("purpose_key", selectedAdminPurposeKey).eq("topic_key", selectedAdminTopicKey);
    if (contentSearch.trim()) query = query.ilike("label_de", `%${contentSearch.trim()}%`);
    const { data, error: loadError } = await query;
    if (loadError) setError(t.saveError);
    else setAdminChoices((data ?? []) as CustomChoice[]);
    setContentLoading(false);
  }, [contentLevel, contentSearch, demo, member, role, selectedAdminPurposeKey, selectedAdminTopicKey, t.saveError]);

  const loadAdminTaxonomy = useCallback(async () => {
    if (!member || demo || role !== "companion") return;
    const { data } = await supabase
      .from("communication_custom_choices")
      .select("id,option_key,choice_level,purpose_key,topic_key,label_de,label_en,is_published,practice_eligible,priority,sort_order")
      .eq("space_id", member.space_id)
      .in("choice_level", ["purpose", "topic"])
      .order("sort_order", { ascending: true })
      .limit(400);
    if (data) {
      const taxonomy = data as CustomChoice[];
      const purposeOptions = taxonomy.filter((item) => item.choice_level === "purpose");
      const topicOptions = taxonomy.filter((item) => item.choice_level === "topic");
      const nextPurposeKey = purposeOptions.some((item) => item.option_key === selectedAdminPurposeKey) ? selectedAdminPurposeKey : purposeOptions[0]?.option_key ?? "";
      const topicsInPurpose = topicOptions.filter((item) => item.purpose_key === nextPurposeKey);
      const nextTopicKey = topicsInPurpose.some((item) => item.option_key === selectedAdminTopicKey) ? selectedAdminTopicKey : topicsInPurpose[0]?.option_key ?? "";
      setAdminPurposeOptions(purposeOptions);
      setAdminTopicOptions(topicOptions);
      setSelectedAdminPurposeKey(nextPurposeKey);
      setSelectedAdminTopicKey(nextTopicKey);
    }
  }, [demo, member, role, selectedAdminPurposeKey, selectedAdminTopicKey, setSelectedAdminPurposeKey, setSelectedAdminTopicKey]);

  const loadAdminSearchNodes = useCallback(async () => {
    if (!member || demo || role !== "companion") return;
    setContentLoading(true);
    const { data, error: loadError } = await supabase
      .from("internet_search_choices")
      .select("id,option_key,parent_key,search_level,label_de,label_en,query_de,query_en,is_published,sort_order")
      .eq("space_id", member.space_id)
      .order("search_level", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(300);
    if (loadError) setError(t.saveError);
    else if (data) setAdminSearchNodes(data as InternetSearchNode[]);
    setContentLoading(false);
  }, [demo, member, role, t.saveError]);

  const loadActivityEvents = useCallback(async () => {
    if (!member || demo || role !== "companion") return;
    const { data } = await supabase.from("interaction_events").select("id,event_type,screen_key,occurred_at,profile_id,metadata").eq("space_id", member.space_id).order("occurred_at", { ascending: false }).limit(120);
    if (data) setActivityEvents(data as ActivityEvent[]);
  }, [demo, member, role]);

  const loadEmailRecipients = useCallback(async () => {
    if (!member || demo || role !== "companion") return;
    const { data, error: loadError } = await supabase
      .from("email_notification_recipients")
      .select("id,email,enabled,consented_at,notify_important,notify_very_important")
      .eq("space_id", member.space_id)
      .order("created_at", { ascending: true });
    if (loadError) setError(t.saveError);
    else setEmailRecipients((data ?? []) as EmailRecipient[]);
  }, [demo, member, role, t.saveError]);

  const loadUsageSummary = useCallback(async (activeMember: Member | null = member) => {
    if (!activeMember) return;
    if (demo) {
      setUsageSummary((current) => ({ ...current, startedAt: new Date(Date.now() - 7 * 86400000).toISOString(), messagesThisWeek: 3, missingThisWeek: 2, activeDays: 4, dailyActivity: ["Mo","Di","Mi","Do","Fr","Sa","So"].map((label, index) => ({ label, count: [1, 2, 1, 3, 0, 1, 2][index] })) }));
      return;
    }
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: events }, { data: sentMessages }, { data: ledger }, { data: budget }] = await Promise.all([
      supabase.from("interaction_events").select("event_type,occurred_at").eq("space_id", activeMember.space_id).gte("occurred_at", since).order("occurred_at", { ascending: true }).limit(1000),
      supabase.from("messages").select("sent_at").eq("space_id", activeMember.space_id).gte("sent_at", since).order("sent_at", { ascending: true }).limit(500),
      supabase.from("ai_usage_ledger").select("input_tokens,output_tokens,estimated_cost_cents,occurred_at").eq("space_id", activeMember.space_id).gte("occurred_at", since).order("occurred_at", { ascending: true }).limit(500),
      supabase.from("ai_budget_settings").select("ai_enabled,review_mode,monthly_request_limit,monthly_input_token_limit,monthly_output_token_limit,monthly_cost_limit_cents").eq("space_id", activeMember.space_id).maybeSingle(),
    ]);
    const eventRows = (events ?? []) as Array<{ event_type: string; occurred_at: string }>;
    const messageRows = (sentMessages ?? []) as Array<{ sent_at: string }>;
    const ledgerRows = (ledger ?? []) as Array<{ input_tokens: number; output_tokens: number; estimated_cost_cents: number; occurred_at: string }>;
    const weekAgo = Date.now() - 7 * 86400000;
    const activityDays = new Set([...eventRows.map((row) => row.occurred_at.slice(0, 10)), ...messageRows.map((row) => row.sent_at.slice(0, 10))]);
    const firstUse = [...eventRows.map((row) => row.occurred_at), ...messageRows.map((row) => row.sent_at), ...ledgerRows.map((row) => row.occurred_at)].sort()[0] ?? null;
    const dailyActivity = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(Date.now() - (6 - offset) * 86400000);
      const key = day.toISOString().slice(0, 10);
      const count = eventRows.filter((row) => row.occurred_at.slice(0, 10) === key).length + messageRows.filter((row) => row.sent_at.slice(0, 10) === key).length;
      return { label: new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { weekday: "short" }).format(day), count };
    });
    setUsageSummary({
      startedAt: firstUse,
      messagesThisWeek: messageRows.filter((row) => new Date(row.sent_at).getTime() >= weekAgo).length,
      missingThisWeek: eventRows.filter((row) => row.event_type === "help_requested" && new Date(row.occurred_at).getTime() >= weekAgo).length,
      activeDays: activityDays.size,
      aiRequests: ledgerRows.length,
      aiInputTokens: ledgerRows.reduce((sum, row) => sum + row.input_tokens, 0),
      aiOutputTokens: ledgerRows.reduce((sum, row) => sum + row.output_tokens, 0),
      aiCostCents: ledgerRows.reduce((sum, row) => sum + row.estimated_cost_cents, 0),
      budget: (budget as AiBudget | null) ?? { ai_enabled: false, review_mode: "manual_only", monthly_request_limit: 0, monthly_input_token_limit: 0, monthly_output_token_limit: 0, monthly_cost_limit_cents: 0 },
      dailyActivity,
    });
  }, [demo, lang, member]);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const current = await getMembership(data.session.user.id);
        if (current) {
          setMember(current); setRole(current.role); setPinMode("unlock"); setView("pin");
        } else {
          const initialRole = data.session.user.user_metadata?.initial_role === "companion" ? "companion" : "user";
          setDesiredRole(initialRole);
          setView("onboarding");
        }
      }
      setBooting(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [getMembership]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refreshVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
  }, []);

  useEffect(() => {
    if (!member || demo) return;
    supabase.from("profile_preferences")
      .select("speech_enabled,auto_read_choices,speech_rate,voice_name,choice_count,text_scale")
      .eq("profile_id", member.profile_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setAudioEnabled(data.speech_enabled);
        setAutoReadChoices(data.auto_read_choices);
        setSpeechRate(Number(data.speech_rate));
        setChoiceCount(normalizePatientChoiceCount(data.choice_count, adminChoiceMaximum));
        setTextScale(Number(data.text_scale) / 1.3);
        if (data.voice_name === "wortnah:female") setVoicePreference("female");
        else if (data.voice_name === "wortnah:male") setVoicePreference("male");
        else setVoicePreference("auto");
      });
  }, [adminChoiceMaximum, member, demo]);

  useEffect(() => {
    if (!member || demo) return;
    supabase.from("space_settings").select("visible_topic_count").eq("space_id", member.space_id).maybeSingle().then(({ data }) => {
      if (data?.visible_topic_count) setAdminChoiceMaximum(normalizePatientChoiceCount(data.visible_topic_count, DEFAULT_ADMIN_CHOICE_MAXIMUM));
    });
  }, [demo, member]);

  useEffect(() => {
    try { window.localStorage.setItem("wortnah:search-history", JSON.stringify(searchHistory)); } catch { /* device-local history is optional */ }
  }, [searchHistory]);

  useEffect(() => {
    if (!member || demo) return;
    void loadPatientChoices("purpose").then((choices) => applyPatientChoices("purpose", choices));
  }, [applyPatientChoices, demo, loadPatientChoices, member]);

  useEffect(() => {
    if (!purpose || !member || demo) return;
    void loadPatientChoices("topic", purpose.id).then((choices) => applyPatientChoices("topic", choices)).finally(() => setPatientChoicesLoading(false));
  }, [applyPatientChoices, demo, loadPatientChoices, member, purpose]);

  useEffect(() => {
    if (!purpose || !topic || !member || demo) return;
    void loadPatientChoices("detail", purpose.id, topic.id).then((choices) => applyPatientChoices("detail", choices)).finally(() => setPatientChoicesLoading(false));
  }, [applyPatientChoices, demo, loadPatientChoices, member, purpose, topic]);

  useEffect(() => {
    if (!member || demo) return;
    const refreshCommunication = () => {
      void loadPatientChoices("purpose").then((choices) => applyPatientChoices("purpose", choices));
      if (purpose) void loadPatientChoices("topic", purpose.id).then((choices) => applyPatientChoices("topic", choices));
      if (purpose && topic) void loadPatientChoices("detail", purpose.id, topic.id).then((choices) => applyPatientChoices("detail", choices));
      if (role === "companion") {
        void loadAdminChoices();
        void loadAdminTaxonomy();
      }
    };
    const channel = supabase
      .channel(`communication-content-${member.space_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "communication_custom_choices" }, refreshCommunication)
      .subscribe();
    const refreshVisibleCommunication = () => {
      if (document.visibilityState === "visible") refreshCommunication();
    };
    window.addEventListener("focus", refreshCommunication);
    document.addEventListener("visibilitychange", refreshVisibleCommunication);
    return () => {
      window.removeEventListener("focus", refreshCommunication);
      document.removeEventListener("visibilitychange", refreshVisibleCommunication);
      void supabase.removeChannel(channel);
    };
  }, [applyPatientChoices, demo, loadAdminChoices, loadAdminTaxonomy, loadPatientChoices, member, purpose, role, topic]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(adminContentPathStorageKey, JSON.stringify({
      level: contentLevel,
      purposeKey: selectedAdminPurposeKey,
      topicKey: selectedAdminTopicKey,
    } satisfies AdminContentPath));
  }, [contentLevel, selectedAdminPurposeKey, selectedAdminTopicKey]);

  useEffect(() => {
    if (!member || demo || (view !== "practice" && adminSection !== "practice")) return;
    const task = window.setTimeout(() => void loadPracticeItems(), 0);
    return () => window.clearTimeout(task);
  }, [adminSection, demo, loadPracticeItems, member, view]);

  useEffect(() => {
    if (!member || demo || view !== "search") return;
    const task = window.setTimeout(() => void loadSearchNodes(), 0);
    return () => window.clearTimeout(task);
  }, [demo, loadSearchNodes, member, view]);

  useEffect(() => {
    if (view !== "admin" || adminSection !== "content" || contentArea !== "communication") return;
    const task = window.setTimeout(() => void loadAdminChoices(), 180);
    return () => window.clearTimeout(task);
  }, [adminSection, contentArea, contentLevel, contentSearch, loadAdminChoices, view]);

  useEffect(() => {
    if (view !== "admin" || adminSection !== "content" || contentArea !== "communication") return;
    const task = window.setTimeout(() => void loadAdminTaxonomy(), 0);
    return () => window.clearTimeout(task);
  }, [adminSection, contentArea, loadAdminTaxonomy, view]);

  useEffect(() => {
    if (view !== "admin" || adminSection !== "content" || contentArea !== "search") return;
    const task = window.setTimeout(() => void loadAdminSearchNodes(), 0);
    return () => window.clearTimeout(task);
  }, [adminSection, contentArea, loadAdminSearchNodes, view]);

  useEffect(() => {
    if (view !== "admin" || adminSection !== "activity") return;
    const task = window.setTimeout(() => void loadActivityEvents(), 0);
    return () => window.clearTimeout(task);
  }, [adminSection, loadActivityEvents, view]);

  useEffect(() => {
    if (view !== "admin" || adminSection !== "settings") return;
    const task = window.setTimeout(() => void loadEmailRecipients(), 0);
    return () => window.clearTimeout(task);
  }, [adminSection, loadEmailRecipients, view]);

  useEffect(() => {
    if (!member || (view !== "messages" && view !== "admin")) return;
    const task = window.setTimeout(() => void loadMessages(member), 0);
    return () => window.clearTimeout(task);
  }, [member, view, loadMessages]);

  useEffect(() => {
    if (!member || view !== "admin") return;
    const task = window.setTimeout(() => void loadUsageSummary(member), 0);
    return () => window.clearTimeout(task);
  }, [member, view, loadUsageSummary]);

  const speakWithDevice = useCallback((text: string, id?: string) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    speechSequenceId.current += 1;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "de" ? "de-DE" : "en-GB";
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    const selectedVoice = selectNaturalDeviceVoice(availableVoices, utterance.lang, voicePreference);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => setSpeaking(id ?? "message");
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, lang, speechRate, availableVoices, voicePreference]);

  const speak = useCallback((text: string, id?: string) => {
    if (!audioEnabled) return;
    const sequenceId = speechSequenceId.current + 1;
    speechSequenceId.current = sequenceId;
    window.speechSynthesis?.cancel();
    const player = remoteAudio.current ?? new Audio();
    player.pause();
    player.onplay = null;
    player.onended = null;
    player.onerror = null;
    remoteAudio.current = player;
    player.preload = "auto";
    player.setAttribute("playsinline", "");

    // Prime this reusable element during the tap so iOS can play the MP3 after the private fetch completes.
    if (!player.src) {
      player.volume = 0;
      player.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";
      void player.play().catch(() => undefined);
    }

    let fallbackStarted = false;
    const fallbackToDevice = () => {
      if (fallbackStarted || speechSequenceId.current !== sequenceId) return;
      fallbackStarted = true;
      speakWithDevice(text, id);
    };
    if (!member || demo || lang !== "de" || voicePreference === "male" || !session?.access_token) {
      fallbackToDevice();
      return;
    }

    const cacheKey = `${member.space_id}:${text.trim().toLocaleLowerCase("de-DE")}`;
    const playPrivateAudio = (blob: Blob) => {
      if (speechSequenceId.current !== sequenceId) return;
      if (remoteAudioUrl.current) URL.revokeObjectURL(remoteAudioUrl.current);
      const objectUrl = URL.createObjectURL(blob);
      remoteAudioUrl.current = objectUrl;
      player.pause();
      player.src = objectUrl;
      player.volume = 1;
      player.onplay = () => setSpeaking(id ?? "message");
      const releaseObjectUrl = () => {
        if (remoteAudioUrl.current === objectUrl) remoteAudioUrl.current = null;
        URL.revokeObjectURL(objectUrl);
      };
      player.onended = () => { releaseObjectUrl(); setSpeaking(null); };
      player.onerror = () => { releaseObjectUrl(); setSpeaking(null); fallbackToDevice(); };
      void player.play().catch(() => { releaseObjectUrl(); fallbackToDevice(); });
    };
    const cachedAudio = privateAudioCache.current.get(cacheKey);
    if (cachedAudio) {
      playPrivateAudio(cachedAudio);
      return;
    }

    void requestPrivateVoiceAudio({
      functionUrl: `${supabaseUrl}/functions/v1/wortnah-audio`,
      accessToken: session.access_token,
      publishableKey: supabasePublishableKey,
      spaceId: member.space_id,
      text,
    }).then((result) => {
      if (result.kind !== "audio") {
        fallbackToDevice();
        return;
      }
      if (privateAudioCache.current.size >= 24) {
        const oldestKey = privateAudioCache.current.keys().next().value;
        if (oldestKey) privateAudioCache.current.delete(oldestKey);
      }
      privateAudioCache.current.set(cacheKey, result.blob);
      playPrivateAudio(result.blob);
    }).catch(() => fallbackToDevice());
  }, [audioEnabled, demo, lang, member, session, speakWithDevice, voicePreference]);

  const logInteraction = useCallback(async (eventType: "screen_view" | "choice_preview" | "choice_confirm" | "choice_repeat" | "back" | "audio_toggle" | "practice_started" | "practice_completed", screenKey: string, metadata: Record<string, unknown> = {}) => {
    if (!member || demo) return;
    await supabase.from("interaction_events").insert({
      space_id: member.space_id,
      profile_id: member.profile_id,
      event_type: eventType,
      screen_key: screenKey,
      choice_count: choiceCount,
      metadata,
    });
  }, [choiceCount, demo, member]);

  const currentChoices = useMemo(() => {
    const toChoice = (item: CustomChoice): Choice => ({ id: item.option_key, de: item.label_de, en: item.label_en || item.label_de });
    if (commStep === "purpose") {
      if (loadedChoiceLevels.purpose) return customPurposes.map(toChoice);
      return purposes;
    }
    if (commStep === "topic") {
      if (patientChoicesLoading) return [];
      if (loadedChoiceLevels.topic) return customTopics.map(toChoice);
      return topicsByPurpose[purpose?.id ?? "tell"] ?? [];
    }
    if (commStep === "detail") {
      if (patientChoicesLoading) return [];
      if (loadedChoiceLevels.detail) return customDetails.map(toChoice);
      return getDetails(purpose?.id ?? "tell", topic?.id ?? "my_day");
    }
    return [];
  }, [commStep, customDetails, customPurposes, customTopics, loadedChoiceLevels, patientChoicesLoading, purpose, topic]);

  const currentSearchNodes = useMemo(
    () => childrenOf(searchNodes, searchPath.at(-1)?.option_key ?? null),
    [searchNodes, searchPath],
  );
  const currentSearchChoices = useMemo<Choice[]>(
    () => currentSearchNodes.map((node) => ({
      id: node.option_key,
      de: node.label_de,
      en: node.label_en || node.label_de,
      icon: searchNodeIcon(node),
    })),
    [currentSearchNodes],
  );

  const readChoiceSequence = useCallback((intro: string, choices: Choice[]) => {
    if (!audioEnabled || !("speechSynthesis" in window) || !choices.length) return;
    const sequenceId = speechSequenceId.current + 1;
    speechSequenceId.current = sequenceId;
    window.speechSynthesis.cancel();
    const locale = lang === "de" ? "de-DE" : "en-GB";
    const selectedVoice = selectNaturalDeviceVoice(availableVoices, locale, voicePreference);
    const items = buildConcisePageReading(intro, choices.map((choice) => ({ id: choice.id, label: choice[lang] })));
    const readNext = (index: number) => {
      if (speechSequenceId.current !== sequenceId || index >= items.length) { setSpeaking(null); return; }
      const item = items[index];
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = locale;
      utterance.rate = speechRate;
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onstart = () => setSpeaking(item.id);
      utterance.onend = () => readNext(index + 1);
      utterance.onerror = () => readNext(index + 1);
      window.speechSynthesis.speak(utterance);
    };
    readNext(0);
  }, [audioEnabled, availableVoices, lang, speechRate, voicePreference]);

  useEffect(() => {
    speechSequenceId.current += 1;
    window.speechSynthesis?.cancel();
    if (!autoReadChoices || !audioEnabled || patientChoicesLoading) { lastAutoReadKey.current = ""; return; }
    let intro = "";
    let choices: Choice[] = [];
    if (view === "home") {
      intro = t.whatDo;
      choices = [
        { id: "home_communicate", de: copy.de.communicate, en: copy.en.communicate },
        { id: "home_search", de: copy.de.search, en: copy.en.search },
        { id: "home_practice", de: copy.de.practice, en: copy.en.practice },
        { id: "home_messages", de: copy.de.messages, en: copy.en.messages },
      ];
    } else if (view === "search") {
      intro = searchPath.length
        ? (lang === "de" ? "Wählen Sie den nächsten Schritt" : "Choose the next step")
        : (lang === "de" ? "Was möchten Sie suchen?" : "What would you like to search?");
      choices = visiblePageChoices;
    } else if (view === "communicate" && ["purpose", "topic", "detail"].includes(commStep)) {
      intro = commStep === "purpose" ? t.choosePurpose : commStep === "topic" ? t.chooseTopic : t.chooseDetail;
      choices = visiblePageChoices;
    }
    if (!choices.length) { lastAutoReadKey.current = ""; return; }
    const key = `${view}:${commStep}:${lang}:${choiceCount}:${choices.map((choice) => choice.id).join(",")}`;
    if (lastAutoReadKey.current === key) return;
    lastAutoReadKey.current = key;
    const task = window.setTimeout(() => readChoiceSequence(intro, choices), 450);
    return () => window.clearTimeout(task);
  }, [audioEnabled, autoReadChoices, choiceCount, commStep, lang, patientChoicesLoading, readChoiceSequence, searchPath.length, t, view, visiblePageChoices]);

  useEffect(() => () => {
    speechSequenceId.current += 1;
    window.speechSynthesis?.cancel();
    remoteAudio.current?.pause();
    remoteAudio.current = null;
    if (remoteAudioUrl.current) URL.revokeObjectURL(remoteAudioUrl.current);
    remoteAudioUrl.current = null;
  }, [view, commStep]);

  useEffect(() => {
    if (!member || demo) return;
    const screenKey = view === "communicate" ? `communicate_${commStep}` : view;
    if (lastTrackedScreen.current === screenKey) return;
    lastTrackedScreen.current = screenKey;
    void logInteraction("screen_view", screenKey);
  }, [commStep, demo, logInteraction, member, view]);

  const resetCommunication = () => {
    setCommStep("purpose"); setPurpose(null); setTopic(null); setDetail(null); setPriority("normal"); setSelected(null); setStatus(""); setShowMissingChoices(false);
  };

  const openHome = () => {
    resetCommunication();
    setSearchPath([]);
    setSelectedSearch(null);
    setView(role === "companion" ? "admin" : "home");
  };

  const handlePilotLogin = async (pin: string) => {
    if (!pilotProfile || authBusy) return;
    setAuthBusy(true);
    setError("");
    try {
      const { data, error: loginError } = await supabase.functions.invoke("pilot-login", {
        body: { profile: pilotProfile, pin },
      });
      if (loginError || !data?.token_hash) {
        setError(data?.error ?? (lang === "de" ? "Zugangscode nicht korrekt oder kurzzeitig gesperrt." : "Access code is incorrect or temporarily locked."));
        return;
      }
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (verifyError || !authData.session?.user) {
        setError(t.saveError);
        return;
      }
      const activeMember = await getMembership(authData.session.user.id, typeof data.space_id === "string" ? data.space_id : null);
      if (!activeMember) {
        setError(t.saveError);
        return;
      }
      setSession(authData.session);
      setMember(activeMember);
      setRole(activeMember.role);
      setPinMode("unlock");
      setView("pin");
    } finally {
      setAuthBusy(false);
    }
  };

  const setupCompanion = async () => {
    setError("");
    const { data, error: setupError } = await supabase.rpc("bootstrap_companion_space");
    if (setupError || !data?.[0]) { setError(setupError?.message ?? t.saveError); return; }
    const active: Member = { space_id: data[0].space_id, profile_id: session!.user.id, role: "companion", label: t.companion };
    setMember(active); setRole("companion"); setPinMode("create"); setView("pin");
  };

  const acceptInvite = async () => {
    setError("");
    const { data, error: inviteError } = await supabase.rpc("accept_user_invite", { p_token: inviteCode });
    if (inviteError || !data) { setError(inviteError?.message ?? t.saveError); return; }
    const active: Member = { space_id: data, profile_id: session!.user.id, role: "user", label: t.user };
    setMember(active); setRole("user"); setPinMode("create"); setView("pin");
  };

  const handlePin = async (pin: string) => {
    if (authBusy) return;
    setAuthBusy(true);
    setError("");
    try {
      if (demo) {
        if (pin !== "2468") { setError(t.wrongPin); return; }
        setView(role === "companion" ? "admin" : "home"); return;
      }
      if (pinMode === "create") {
        const { error: pinError } = await supabase.rpc("set_access_pin", { p_pin: pin });
        if (pinError) { setError(t.saveError); return; }
        setView(role === "companion" ? "admin" : "home");
        return;
      }
      const { data, error: verifyError } = await supabase.rpc("verify_access_pin", { p_pin: pin });
      if (verifyError || !data) { setError(t.wrongPin); return; }
      setView(role === "companion" ? "admin" : "home");
    } finally {
      setAuthBusy(false);
    }
  };

  const chooseSearch = (choice: Choice) => {
    const node = currentSearchNodes.find((item) => item.option_key === choice.id);
    if (!node) return;
    if (selectedSearch !== choice.id) {
      setSelectedSearch(choice.id);
      void logInteraction("choice_preview", "internet_search", { choice_id: choice.id, level: node.search_level });
      const preview = lang === "de" ? node.query_de || node.label_de : node.query_en || node.label_en || node.label_de;
      speak(preview, `search-${choice.id}`);
      return;
    }
    setSelectedSearch(null);
    const nextNodes = childrenOf(searchNodes, node.option_key);
    void logInteraction("choice_confirm", "internet_search", { choice_id: choice.id, level: node.search_level });
    if (nextNodes.length) {
      setSearchPath((path) => [...path, node]);
      return;
    }
    const query = lang === "de" ? node.query_de || node.label_de : node.query_en || node.label_en || node.label_de;
    const entry = { id: crypto.randomUUID(), text: query, createdAt: new Date().toISOString() };
    setSearchHistory((items) => [entry, ...items.filter((item) => item.text !== entry.text)].slice(0, 12));
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  };

  const searchBack = () => {
    setSelectedSearch(null);
    if (searchPath.length) {
      setSearchPath((path) => path.slice(0, -1));
      return;
    }
    openHome();
  };

  const chooseCommunication = (choice: Choice) => {
    if (selected !== choice.id) {
      setSelected(choice.id);
      void logInteraction("choice_preview", `communicate_${commStep}`, { choice_id: choice.id, purpose_id: purpose?.id ?? null, topic_id: topic?.id ?? null });
      speak(choice[lang], choice.id);
      return;
    }
    setSelected(null);
    void logInteraction("choice_confirm", `communicate_${commStep}`, { choice_id: choice.id, purpose_id: purpose?.id ?? null, topic_id: topic?.id ?? null });
    if (commStep === "purpose") { if (!demo) setPatientChoicesLoading(true); setLoadedChoiceLevels((levels) => ({ ...levels, topic: false, detail: false })); setCustomTopics([]); setCustomDetails([]); setPurpose(choice); setTopic(null); setCommStep("topic"); }
    else if (commStep === "topic") { if (!demo) setPatientChoicesLoading(true); setLoadedChoiceLevels((levels) => ({ ...levels, detail: false })); setCustomDetails([]); setTopic(choice); setCommStep("detail"); }
    else if (commStep === "detail") { setDetail(choice); setCommStep("review"); speak(choice[lang]); }
  };

  const reportMissing = async (missingType: string) => {
    const confirmation = lang === "de"
      ? "Danke. Begleitung sieht jetzt, wo etwas fehlt."
      : "Thank you. Support can now see where something is missing.";
    setStatus(confirmation);
    speak(confirmation);
    setShowMissingChoices(false);
    if (demo) {
      setUsageSummary((current) => ({ ...current, missingThisWeek: current.missingThisWeek + 1 }));
      return;
    }
    if (!member) return;
    const isSearchReport = view === "search";
    await supabase.from("interaction_events").insert({
      space_id: member.space_id,
      profile_id: member.profile_id,
      event_type: "help_requested",
      screen_key: isSearchReport ? "internet_search" : `communicate_${commStep}`,
      choice_count: choiceCount,
      metadata: {
        reason: "missing_option",
        missing_type: missingType,
        purpose_id: isSearchReport ? null : purpose?.id ?? null,
        topic_id: isSearchReport ? null : topic?.id ?? null,
        selected_choice_id: isSearchReport ? selectedSearch : selected,
        visible_option_ids: (isSearchReport ? currentSearchChoices : currentChoices).slice(0, choiceCount).map((choice) => choice.id),
      },
    });
  };

  const communicationBack = () => {
    void logInteraction("back", `communicate_${commStep}`);
    setSelected(null);
    if (commStep === "purpose") { openHome(); return; }
    if (commStep === "topic") { setPurpose(null); setCommStep("purpose"); }
    else if (commStep === "detail") { setTopic(null); setCommStep("topic"); }
    else if (["review", "practice", "priority"].includes(commStep)) setCommStep("detail");
    else openHome();
  };

  const sendMessage = async () => {
    if (!detail || !purpose || !topic || !member || messageSending) return;
    setError("");
    setStatus("");
    setMessageSending(true);
    if (demo) {
      setMessages((items) => [{ id: crypto.randomUUID(), body_de: detail.de, body_en: detail.en, priority, sent_at: new Date().toISOString(), sender_profile_id: "user", message_receipts: [] }, ...items]);
      setStatus(priority === "normal" ? "Mitteilung gespeichert. Normale Priorität – keine E-Mail." : "Mitteilung gespeichert. E-Mail-Benachrichtigung vorgemerkt.");
      setCommStep("success"); setMessageSending(false); return;
    }
    try {
      const navigationPathDe = [purpose.de, topic.de, detail.de].join(" › ");
      const { data, error: sendError } = await supabase.from("messages").insert({
        space_id: member.space_id, sender_profile_id: member.profile_id, purpose_node_id: purposeIds[purpose.id] ?? null, topic_node_id: topicIds[topic.id] ?? null,
        content_type: "text", body_de: detail.de, body_en: detail.en, priority,
        navigation_path_de: navigationPathDe, email_notification_requested: priority !== "normal",
      }).select("id").single();
      if (sendError || !data) { setError(t.saveError); return; }

      await supabase.from("interaction_events").insert({ space_id: member.space_id, profile_id: member.profile_id, event_type: "message_sent", screen_key: "message_success", choice_count: choiceCount, metadata: { purpose_id: purpose.id, topic_id: topic.id, priority } });

      if (priority === "normal") {
        setStatus("Mitteilung gespeichert. Normale Priorität – keine E-Mail.");
      } else {
        const { data: deliveryResult, error: deliveryError } = await supabase.functions.invoke("send-message-email-alerts", {
          body: { mode: "message", message_id: data.id },
        });
        const deliveryStatus = deliveryResult?.status as string | undefined;
        if (!deliveryError && deliveryStatus === "sent") setStatus("Mitteilung gespeichert und E-Mail gesendet.");
        else if (!deliveryError && deliveryStatus === "no_recipients") setStatus("Mitteilung gespeichert. Es ist keine E-Mail-Benachrichtigung eingeschaltet.");
        else if (!deliveryError && deliveryStatus === "failed") setStatus("Mitteilung gespeichert. Die E-Mail konnte nicht gesendet werden. Begleitung sieht den Fehler.");
        else setStatus("Mitteilung gespeichert. Die E-Mail wird automatisch weiter versucht.");
      }
      await loadMessages(member);
      setCommStep("success");
    } finally {
      setMessageSending(false);
    }
  };

  const markRead = async (message: AppMessage) => {
    if (!member) return;
    if (!demo) {
      const { error: readError } = await supabase.from("message_receipts").upsert({ message_id: message.id, space_id: member.space_id, profile_id: member.profile_id }, { onConflict: "message_id,profile_id" });
      if (readError) { setError(t.saveError); return; }
    }
    setMessages((items) => items.map((item) => item.id === message.id ? { ...item, message_receipts: [{ profile_id: member.profile_id, read_at: new Date().toISOString() }] } : item));
  };

  const retryEmailDelivery = async (message: AppMessage) => {
    if (!member || role !== "companion" || emailSettingsBusy) return;
    const failedDelivery = message.email_notification_deliveries?.find((delivery) => delivery.status === "failed");
    if (!failedDelivery) return;
    setEmailSettingsBusy(true); setError(""); setStatus("E-Mail wird erneut versucht …");
    try {
      const { data, error: retryError } = await supabase.functions.invoke("send-message-email-alerts", {
        body: { mode: "retry", delivery_id: failedDelivery.id },
      });
      if (retryError || data?.status === "failed") setError("Die E-Mail konnte noch nicht gesendet werden.");
      else setStatus(data?.status === "sent" ? "E-Mail wurde gesendet." : "Die E-Mail wird automatisch weiter versucht.");
      await loadMessages(member);
    } finally { setEmailSettingsBusy(false); }
  };

  const savePreference = async (patch: Record<string, unknown>) => {
    if (!member || demo) return;
    await supabase.from("profile_preferences").update({ ...patch, updated_by: member.profile_id }).eq("profile_id", member.profile_id);
  };

  const saveAdminChoiceMaximum = async (count: PatientChoiceCount) => {
    if (!member || role !== "companion" || settingsBusy) return;
    setSettingsBusy(true);
    setError("");
    try {
      const { data, error: updateError } = await supabase
        .from("space_settings")
        .update({ visible_topic_count: count, updated_by: member.profile_id })
        .eq("space_id", member.space_id)
        .select("visible_topic_count")
        .single();
      if (updateError || !data) { setError(t.saveError); return; }
      const savedMaximum = normalizePatientChoiceCount(data.visible_topic_count, DEFAULT_ADMIN_CHOICE_MAXIMUM);
      setAdminChoiceMaximum(savedMaximum);
      setChoiceCount((current) => normalizePatientChoiceCount(current, savedMaximum));
      setEditorNotice(`Maximal ${savedMaximum} Felder sind jetzt freigegeben.`);
    } finally {
      setSettingsBusy(false);
    }
  };

  const addEmailRecipient = async () => {
    if (!member || role !== "companion" || emailSettingsBusy) return;
    const email = emailRecipientDraft.trim().toLocaleLowerCase("de-DE");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (!emailRecipientConsent) { setError("Bitte bestätigen Sie zuerst die Zustimmung der empfangenden Person."); return; }
    if (emailRecipients.length >= 3) { setError("Es können höchstens drei E-Mail-Empfänger gespeichert werden."); return; }
    setEmailSettingsBusy(true); setError(""); setEmailSettingsNotice("");
    try {
      const { error: insertError } = await supabase.from("email_notification_recipients").insert({
        space_id: member.space_id,
        created_by: member.profile_id,
        email,
        enabled: true,
        notify_normal: false,
        notify_important: true,
        notify_very_important: true,
        consented_at: new Date().toISOString(),
      });
      if (insertError) { setError(t.saveError); return; }
      setEmailRecipientDraft(""); setEmailRecipientConsent(false);
      setEmailSettingsNotice("E-Mail-Empfänger wurde gespeichert und eingeschaltet.");
      await loadEmailRecipients();
    } finally { setEmailSettingsBusy(false); }
  };

  const toggleEmailRecipient = async (recipient: EmailRecipient) => {
    if (!member || role !== "companion" || emailSettingsBusy) return;
    setEmailSettingsBusy(true); setError(""); setEmailSettingsNotice("");
    try {
      const { error: updateError } = await supabase
        .from("email_notification_recipients")
        .update({ enabled: !recipient.enabled })
        .eq("id", recipient.id)
        .eq("space_id", member.space_id);
      if (updateError) { setError(t.saveError); return; }
      setEmailSettingsNotice(!recipient.enabled ? "E-Mail-Benachrichtigung ist eingeschaltet." : "E-Mail-Benachrichtigung ist ausgeschaltet.");
      await loadEmailRecipients();
    } finally { setEmailSettingsBusy(false); }
  };

  const removeEmailRecipient = async (recipient: EmailRecipient) => {
    if (!member || role !== "companion" || emailSettingsBusy) return;
    if (!window.confirm(`E-Mail-Empfänger „${recipient.email}“ wirklich entfernen?`)) return;
    setEmailSettingsBusy(true); setError(""); setEmailSettingsNotice("");
    try {
      const { error: deleteError } = await supabase
        .from("email_notification_recipients")
        .delete()
        .eq("id", recipient.id)
        .eq("space_id", member.space_id);
      if (deleteError) { setError(t.saveError); return; }
      setEmailSettingsNotice("E-Mail-Empfänger wurde entfernt.");
      await loadEmailRecipients();
    } finally { setEmailSettingsBusy(false); }
  };

  const sendEmailRecipientTest = async (recipient: EmailRecipient) => {
    if (emailSettingsBusy || !recipient.enabled) return;
    setEmailSettingsBusy(true); setError(""); setEmailSettingsNotice("Test-E-Mail wird gesendet …");
    try {
      const { data, error: testError } = await supabase.functions.invoke("send-message-email-alerts", {
        body: { mode: "test", recipient_id: recipient.id },
      });
      if (testError || data?.status !== "sent") { setError("Die Test-E-Mail konnte nicht gesendet werden."); setEmailSettingsNotice(""); return; }
      setEmailSettingsNotice("Test-E-Mail wurde gesendet.");
    } finally { setEmailSettingsBusy(false); }
  };

  const startChoiceEditor = (item?: CustomChoice) => {
    setError("");
    setEditorNotice("");
    setEditingChoice(item ?? null);
    setCreatingChoice(!item);
    setChoiceDraft(item ? {
      label_de: item.label_de,
      label_en: item.label_en,
      purpose_key: item.purpose_key ?? "request",
      topic_key: item.topic_key ?? "",
      priority: item.priority,
      practice_eligible: item.practice_eligible,
      is_published: item.is_published,
      sort_order: item.sort_order,
    } : {
      label_de: "",
      label_en: "",
      purpose_key: contentLevel === "purpose" ? "" : selectedAdminPurposeKey,
      topic_key: contentLevel === "detail" ? selectedAdminTopicKey : "",
      priority: "medium",
      practice_eligible: false,
      is_published: true,
      sort_order: adminChoices.length ? Math.max(...adminChoices.map((entry) => entry.sort_order)) + 10 : 10,
    });
  };

  const closeChoiceEditor = () => { setEditingChoice(null); setCreatingChoice(false); setError(""); };

  const saveChoice = async () => {
    if (!member || editorBusy || !choiceDraft.label_de.trim()) { if (!choiceDraft.label_de.trim()) setError("Bitte deutschen Text eingeben."); return; }
    const payload = {
      label_de: choiceDraft.label_de.trim(),
      choice_level: contentLevel,
      purpose_key: contentLevel === "purpose" ? null : choiceDraft.purpose_key || null,
      topic_key: contentLevel === "detail" ? choiceDraft.topic_key || null : null,
      priority: choiceDraft.priority,
      practice_eligible: contentLevel === "detail" && choiceDraft.practice_eligible,
      is_published: choiceDraft.is_published,
      sort_order: Number(choiceDraft.sort_order) || 1000,
    };
    if (contentLevel === "topic" && !payload.purpose_key) { setError("Bitte einen Bereich wählen."); return; }
    if (contentLevel === "detail" && !payload.topic_key) { setError("Bitte ein Thema wählen."); return; }
    setEditorBusy(true);
    setError("");
    try {
      if (editingChoice?.choice_level === "topic" && editingChoice.purpose_key !== payload.purpose_key) {
        const { count, error: childError } = await supabase.from("communication_custom_choices").select("id", { count: "exact", head: true }).eq("space_id", member.space_id).eq("topic_key", editingChoice.option_key);
        if (childError) { setError(t.saveError); return; }
        if ((count ?? 0) > 0) {
          setError("Dieses Thema enthält Wörter oder Sätze. Verschieben Sie diese zuerst, bevor Sie das Thema in einen anderen Bereich verschieben.");
          return;
        }
      }
      const result = editingChoice
        ? await supabase.from("communication_custom_choices").update(payload).eq("id", editingChoice.id).eq("space_id", member.space_id).select("id").single()
        : await supabase.from("communication_custom_choices").insert({
            ...payload,
            label_en: "",
            space_id: member.space_id,
            created_by: member.profile_id,
            option_key: `admin_${contentLevel}_${crypto.randomUUID().replaceAll("-", "")}`,
            source_name: "Wortnah Admin",
          }).select("id").single();
      if (result.error || !result.data) { setError(t.saveError); return; }
      const savedLabel = choiceDraft.label_de.trim();
      closeChoiceEditor();
      setEditorNotice(`„${savedLabel}“ wurde gespeichert.`);
      if (contentLevel !== "detail") await loadAdminTaxonomy();
      await loadAdminChoices();
    } finally {
      setEditorBusy(false);
    }
  };

  const toggleChoicePublished = async (item: CustomChoice) => {
    if (!member || editorBusy) return;
    setEditorBusy(true);
    setError("");
    setEditorNotice("");
    try {
      const { data, error: updateError } = await supabase.from("communication_custom_choices").update({ is_published: !item.is_published }).eq("id", item.id).eq("space_id", member.space_id).select("id").single();
      if (updateError || !data) { setError(t.saveError); await loadAdminChoices(); return; }
      if (item.choice_level !== "detail") await loadAdminTaxonomy();
      await loadAdminChoices();
      setEditorNotice(`„${item.label_de}“ ist jetzt ${item.is_published ? "ausgeblendet" : "für Werner sichtbar"}.`);
    } finally {
      setEditorBusy(false);
    }
  };

  const moveChoice = async (item: CustomChoice, direction: -1 | 1) => {
    if (!member || editorBusy || contentSearch.trim()) return;
    const currentIndex = adminChoices.findIndex((entry) => entry.id === item.id);
    const other = adminChoices[currentIndex + direction];
    if (currentIndex < 0 || !other) return;
    const currentOrder = item.sort_order;
    const otherOrder = other.sort_order;
    setEditorBusy(true);
    setError("");
    setEditorNotice("");
    try {
      const [currentResult, otherResult] = await Promise.all([
        supabase.from("communication_custom_choices").update({ sort_order: otherOrder }).eq("id", item.id).eq("space_id", member.space_id).select("id").single(),
        supabase.from("communication_custom_choices").update({ sort_order: currentOrder }).eq("id", other.id).eq("space_id", member.space_id).select("id").single(),
      ]);
      if (currentResult.error || otherResult.error || !currentResult.data || !otherResult.data) { setError(t.saveError); await loadAdminChoices(); return; }
      if (item.choice_level !== "detail") await loadAdminTaxonomy();
      await loadAdminChoices();
      setEditorNotice(`„${item.label_de}“ wurde verschoben.`);
    } finally {
      setEditorBusy(false);
    }
  };

  const deleteChoice = async (item: CustomChoice) => {
    if (!member || editorBusy) return;
    if (item.choice_level !== "detail") {
      let childrenQuery = supabase.from("communication_custom_choices").select("id", { count: "exact", head: true }).eq("space_id", member.space_id);
      childrenQuery = item.choice_level === "purpose" ? childrenQuery.eq("purpose_key", item.option_key) : childrenQuery.eq("topic_key", item.option_key);
      const { count, error: childError } = await childrenQuery;
      if (childError) { setError(t.saveError); return; }
      if ((count ?? 0) > 0) {
        window.alert(`„${item.label_de}“ enthält noch ${count} untergeordnete ${item.choice_level === "purpose" ? "Themen oder Wörter und Sätze" : "Wörter und Sätze"}. Verschieben oder löschen Sie diese zuerst. Sie können den Bereich stattdessen ausblenden.`);
        return;
      }
    }
    const confirmed = window.confirm(`„${item.label_de}“ dauerhaft löschen?`);
    if (!confirmed) return;
    setEditorBusy(true);
    setError("");
    setEditorNotice("");
    try {
      const { data, error: deleteError } = await supabase.from("communication_custom_choices").delete().eq("id", item.id).eq("space_id", member.space_id).select("id").single();
      if (deleteError || !data) { setError(t.saveError); await loadAdminChoices(); return; }
      if (item.choice_level !== "detail") await loadAdminTaxonomy();
      await loadAdminChoices();
      setEditorNotice(`„${item.label_de}“ wurde gelöscht.`);
    } finally {
      setEditorBusy(false);
    }
  };

  const startSearchEditor = (item?: InternetSearchNode) => {
    setError("");
    setEditorNotice("");
    setEditingSearchNode(item ?? null);
    setCreatingSearchNode(!item);
    setSearchDraft(item ? {
      label_de: item.label_de,
      label_en: item.label_en,
      parent_key: item.parent_key ?? "",
      query_de: item.query_de ?? "",
      query_en: item.query_en ?? "",
      is_published: item.is_published,
      sort_order: item.sort_order,
    } : { label_de: "", label_en: "", parent_key: "", query_de: "", query_en: "", is_published: true, sort_order: 1000 });
  };

  const closeSearchEditor = () => { setEditingSearchNode(null); setCreatingSearchNode(false); setError(""); };

  const saveSearchNode = async () => {
    if (!member || editorBusy || !searchDraft.label_de.trim()) { if (!searchDraft.label_de.trim()) setError("Bitte deutschen Text eingeben."); return; }
    if (adminSearchLevel > 1 && !searchDraft.parent_key) { setError("Bitte den übergeordneten Bereich wählen."); return; }
    const payload = {
      parent_key: adminSearchLevel === 1 ? null : searchDraft.parent_key,
      search_level: adminSearchLevel,
      label_de: searchDraft.label_de.trim(),
      query_de: searchDraft.query_de.trim() || null,
      is_published: searchDraft.is_published,
      sort_order: Number(searchDraft.sort_order) || 1000,
    };
    setEditorBusy(true);
    setError("");
    try {
      const result = editingSearchNode
        ? await supabase.from("internet_search_choices").update(payload).eq("id", editingSearchNode.id).eq("space_id", member.space_id).select("id").single()
        : await supabase.from("internet_search_choices").insert({
            ...payload,
            label_en: "",
            query_en: null,
            space_id: member.space_id,
            created_by: member.profile_id,
            option_key: `admin-${crypto.randomUUID()}`,
          }).select("id").single();
      if (result.error || !result.data) { setError(t.saveError); return; }
      const savedLabel = searchDraft.label_de.trim();
      closeSearchEditor();
      setEditorNotice(`„${savedLabel}“ wurde gespeichert.`);
      await loadAdminSearchNodes();
    } finally {
      setEditorBusy(false);
    }
  };

  const toggleSearchPublished = async (item: InternetSearchNode) => {
    if (!member) return;
    const { data, error: updateError } = await supabase.from("internet_search_choices").update({ is_published: !item.is_published }).eq("id", item.id).eq("space_id", member.space_id).select("id").single();
    if (updateError || !data) { setError(t.saveError); return; }
    setAdminSearchNodes((items) => items.map((entry) => entry.id === item.id ? { ...entry, is_published: !entry.is_published } : entry));
    setSearchNodes((items) => items.map((entry) => entry.id === item.id ? { ...entry, is_published: !entry.is_published } : entry));
  };

  const deleteSearchNode = async (item: InternetSearchNode) => {
    if (!member) return;
    const confirmed = window.confirm(`„${item.label_de}“ und untergeordnete Einträge dauerhaft löschen?`);
    if (!confirmed) return;
    const { data, error: deleteError } = await supabase.from("internet_search_choices").delete().eq("id", item.id).eq("space_id", member.space_id).select("id").single();
    if (deleteError || !data) { setError(t.saveError); return; }
    setEditorNotice(`„${item.label_de}“ wurde gelöscht.`);
    await loadAdminSearchNodes();
  };

  const startPracticeEditor = (item?: PracticeItem) => {
    setError("");
    setEditorNotice("");
    setEditingPractice(item ?? null);
    setCreatingPractice(!item);
    setPracticeDraft(item ? { label_de: item.label_de, label_en: item.label_en, difficulty: item.difficulty, sort_order: item.sort_order } : { label_de: "", label_en: "", difficulty: "easy", sort_order: 1000 });
  };

  const closePracticeEditor = () => { setEditingPractice(null); setCreatingPractice(false); setError(""); };

  const savePracticeItem = async () => {
    if (!member || editorBusy || !practiceDraft.label_de.trim()) { if (!practiceDraft.label_de.trim()) setError("Bitte einen Übungstext eingeben."); return; }
    const payload = { label_de: practiceDraft.label_de.trim(), difficulty: practiceDraft.difficulty, sort_order: Number(practiceDraft.sort_order) || 1000 };
    setEditorBusy(true);
    setError("");
    try {
      const result = editingPractice
        ? await supabase.from("communication_practice_items").update(payload).eq("id", editingPractice.id).eq("space_id", member.space_id).select("id").single()
        : await supabase.from("communication_practice_items").insert({ ...payload, label_en: "", space_id: member.space_id, created_by: member.profile_id, source_key: `admin_practice_${crypto.randomUUID().replaceAll("-", "")}`, source_name: "Wortnah Admin" }).select("id").single();
      if (result.error || !result.data) { setError(t.saveError); return; }
      const savedLabel = practiceDraft.label_de.trim();
      closePracticeEditor();
      setEditorNotice(`„${savedLabel}“ wurde gespeichert.`);
      await loadPracticeItems();
    } finally {
      setEditorBusy(false);
    }
  };

  const deletePracticeItem = async (item: PracticeItem) => {
    const confirmed = window.confirm(lang === "de" ? `„${item.label_de}“ dauerhaft löschen?` : `Permanently delete “${item.label_de}”?`);
    if (!confirmed) return;
    const { error: deleteError } = await supabase.from("communication_practice_items").delete().eq("id", item.id);
    if (deleteError) { setError(t.saveError); return; }
    setPracticeItems((items) => items.filter((entry) => entry.id !== item.id));
  };

  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    setSession(null); setMember(null); setRole(null); setDemo(false); setView("welcome"); setError("");
  };

  const audioMode = !audioEnabled ? "off" : speechRate <= 0.74 ? "slow" : "on";
  const audioModeLabel = audioMode === "off"
    ? (lang === "de" ? "Audio aus" : "Audio off")
    : audioMode === "slow"
      ? (lang === "de" ? "Audio langsam" : "Slow audio")
      : (lang === "de" ? "Audio an" : "Audio on");
  const cycleAudioMode = () => {
    window.speechSynthesis?.cancel();
    remoteAudio.current?.pause();
    if (audioMode === "on") {
      setAudioEnabled(false);
      void savePreference({ speech_enabled: false });
      return;
    }
    if (audioMode === "off") {
      setAudioEnabled(true);
      setSpeechRate(0.72);
      void savePreference({ speech_enabled: true, speech_rate: 0.72 });
      return;
    }
    setSpeechRate(0.82);
    void savePreference({ speech_enabled: true, speech_rate: 0.82 });
  };

  const choosePatientFieldCount = (count: PatientChoiceCount) => {
    setChoiceCount(count);
    void savePreference({ choice_count: count });
  };

  const cyclePatientFieldCount = () => {
    choosePatientFieldCount(nextPatientChoiceCount(choiceCount, adminChoiceMaximum));
  };

  const shellHeader = (title?: string, allowBack = false) => (
    <header className="app-header">
      <div className="header-left">{allowBack && role === "companion" && <button className="header-button" onClick={openHome}><ArrowLeft /><span>{t.back}</span></button>}<Logo /></div>
      {title && <strong className="header-title">{title}</strong>}
      <div className="header-actions">
        {role === "user" && <>
          <button className="header-button round-control" onClick={openHome} aria-label={t.home} title={t.home}><House /><span>{lang === "de" ? "Start" : "Home"}</span></button>
          <button className="header-button field-count-control" onClick={cyclePatientFieldCount} aria-label={`${choiceCount} Felder. Antippen für ${nextPatientChoiceCount(choiceCount, adminChoiceMaximum)} Felder.`} title="Anzahl der Felder ändern">
            <Layers3 aria-hidden="true" />
            <span className="field-count-label">Felder</span>
            <strong>{choiceCount}</strong>
          </button>
        </>}
        <button className={`header-button round-control audio-${audioMode}`} onClick={cycleAudioMode} aria-label={audioModeLabel} title={audioModeLabel}>{audioMode === "off" ? <VolumeX /> : <Volume2 />}<span>{audioModeLabel}</span></button>
      </div>
    </header>
  );

  if (booting) return <main className="app-shell loading-screen"><Logo /><div className="loading-bar" /></main>;

  if (view === "welcome") return (
    <main className="welcome-page" style={{ "--text-scale": textScale } as React.CSSProperties}>
      <div className="welcome-brand"><Logo /><p>{t.tagline}</p></div>
      <section className="welcome-card">
        <div className="trust-row"><span><ShieldCheck /> {t.secure}</span><span><Sparkles /> {t.install}</span></div>
        <h1>{lang === "de" ? "Wer nutzt Wortnah?" : "Who is using Wortnah?"}</h1>
        <p className="profile-help">{lang === "de" ? "Profil auswählen und den vierstelligen Zugangscode eingeben." : "Choose a profile and enter its four-digit access code."}</p>
        <div className="role-grid pilot-role-grid">
          <button className="role-card user-role" onClick={() => { setPilotProfile("werner"); setDesiredRole("user"); setError(""); setView("login"); }}><span className="role-icon"><UserRound /></span><span><strong>Werner</strong><small>{t.userHint}</small></span><ChevronRight /></button>
          <button className="role-card companion-role" onClick={() => { setPilotProfile("admin1"); setDesiredRole("companion"); setError(""); setView("login"); }}><span className="role-icon"><ShieldCheck /></span><span><strong>Admin 1</strong><small>{t.companionHint}</small></span><ChevronRight /></button>
          <button className="role-card companion-role" onClick={() => { setPilotProfile("admin2"); setDesiredRole("companion"); setError(""); setView("login"); }}><span className="role-icon"><ShieldCheck /></span><span><strong>Admin 2</strong><small>{t.companionHint}</small></span><ChevronRight /></button>
        </div>
      </section>
    </main>
  );

  if (view === "login") {
    const profileLabel = pilotProfile === "werner" ? "Werner" : pilotProfile === "admin1" ? "Admin 1" : "Admin 2";
    return <main className="app-shell"><PinPad key={`access-${pilotProfile}`} stepLabel="Schritt 1 von 2" title={`${profileLabel} · Zugangscode`} hint="Geben Sie zuerst den vierstelligen Zugangscode für dieses Profil ein." submitLabel="Zugang prüfen" cancelLabel="Abbrechen" error={error} busy={authBusy} busyLabel="Zugang wird geprüft …" onComplete={handlePilotLogin} onInput={() => setError("")} onBack={() => { setPilotProfile(null); setError(""); setView("welcome"); }} /></main>;
  }

  if (view === "onboarding") return (
    <main className="app-shell auth-page">
      <section className="auth-card">
        <Logo />
        {desiredRole === "companion" ? <><div className="pin-icon"><ShieldCheck /></div><h1>{t.setupCompanion}</h1><p>{t.companionHint}</p><button className="primary-button" onClick={setupCompanion}>{t.continue}<ChevronRight /></button></> : <><div className="pin-icon"><UserRound /></div><h1>{t.invite}</h1><p>{t.inviteHint}</p><label>{t.invite}<input className="invite-input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} maxLength={8} /></label><button className="primary-button" onClick={acceptInvite}>{t.continue}<ChevronRight /></button></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="text-action" onClick={signOut}>{t.signOut}</button>
      </section>
    </main>
  );

  if (view === "pin") return <main className="app-shell"><PinPad key={`daily-${pinMode}-${member?.profile_id ?? "setup"}`} stepLabel={pinMode === "unlock" ? "Schritt 2 von 2" : "Gerät einrichten"} title={pinMode === "create" ? t.setPin : "Tägliche PIN eingeben"} hint={pinMode === "unlock" ? "Der Zugangscode stimmt. Geben Sie jetzt die vierstellige tägliche PIN ein." : t.pinHint} submitLabel={pinMode === "create" ? "PIN speichern" : "Anmelden"} cancelLabel="Zurück" error={error} busy={authBusy} busyLabel="PIN wird geprüft …" onComplete={handlePin} onInput={() => setError("")} onBack={pinMode === "unlock" ? signOut : () => setView("onboarding")} />{pinMode === "unlock" && !demo && <button className="forgot-pin" onClick={signOut} disabled={authBusy}>{t.forgotPin}</button>}</main>;

  if (view === "home") return (
    <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>
      {shellHeader()}
      <div className="content-wrap home-content">
        <div className="page-intro"><span className="mode-pill">{demo ? t.demoMode : t.liveMode}</span><h1>{t.whatDo}</h1></div>
        <div className="home-actions">
          <button className="home-card communicate-card" onClick={() => { resetCommunication(); setView("communicate"); }}><span className="home-icon"><MessageCircle /></span><span><strong>{t.communicate}</strong><small>{lang === "de" ? "Eine Nachricht zusammenstellen" : "Build a message"}</small></span><ChevronRight /></button>
          <button className="home-card search-card" onClick={() => { setSearchPath([]); setSelectedSearch(null); setShowMissingChoices(false); setView("search"); }}><span className="home-icon"><Search /></span><span><strong>{t.search}</strong><small>{lang === "de" ? "Schritt für Schritt zum Suchsatz" : "Build a search step by step"}</small></span><ChevronRight /></button>
          <button className="home-card practice-card" onClick={() => { void logInteraction("practice_started", "practice"); setPracticeIndex(0); setView("practice"); }}><span className="home-icon"><BookOpen /></span><span><strong>{t.practice}</strong><small>{lang === "de" ? "Hören und nachsprechen" : "Listen and repeat"}</small></span><ChevronRight /></button>
          <button className="home-card messages-card" onClick={() => setView("messages")}><span className="home-icon"><Bell /></span><span><strong>{t.messages}</strong><small>{messages.length ? `${messages.length} ${lang === "de" ? "Mitteilung(en)" : "message(s)"}` : t.noMessages}</small></span><ChevronRight /></button>
        </div>
        <button className="settings-card" onClick={() => setView("settings")}><Settings2 /><span><strong>{t.settings}</strong><small>{lang === "de" ? "Ton, Anzeige und Auswahl" : "Sound, display and choices"}</small></span><ChevronRight /></button>
      </div>
      <footer className="status-footer"><span className={online ? "online" : "offline"} />{online ? t.online : t.offline}</footer>
    </main>
  );

  if (view === "search") return (
    <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>
      {shellHeader(t.search, true)}
      <div className="content-wrap communication-content">
        {searchPath.length > 0 && <nav className="search-path" aria-label={lang === "de" ? "Suchpfad" : "Search path"}><button onClick={() => { setSearchPath([]); setSelectedSearch(null); }}>{t.search}</button>{searchPath.map((node, index) => <span key={node.option_key}><ChevronRight /><button onClick={() => { setSearchPath((path) => path.slice(0, index + 1)); setSelectedSearch(null); }}>{lang === "de" ? node.label_de : node.label_en || node.label_de}</button></span>)}</nav>}
        <div className="page-heading"><span className="search-level-pill">{lang === "de" ? "Ebene" : "Level"} {searchPath.length + 1}</span><h1>{searchPath.length ? (lang === "de" ? "Wählen Sie den nächsten Schritt" : "Choose the next step") : (lang === "de" ? "Was möchten Sie suchen?" : "What would you like to search?")}</h1><p>{t.firstTap}</p></div>
        <ChoiceGrid key={`search-${searchPath.at(-1)?.option_key ?? "root"}-${choiceCount}`} choices={currentSearchChoices} lang={lang} selected={selectedSearch} speaking={speaking} onChoose={chooseSearch} onVisibleChoicesChange={reportVisibleChoices} count={choiceCount} />
        <button className="missing-topic-button" onClick={() => setShowMissingChoices((value) => !value)}><Plus />{t.missingTopic}</button>
        {showMissingChoices && <section className="missing-choice-panel"><h2>{t.whatMissing}</h2><div>{[{ id: "topic", de: "Suchthema fehlt", en: "Search topic is missing" }, { id: "result", de: "Passendes Ergebnis fehlt", en: "The right result is missing" }, { id: "help", de: "Ich brauche Hilfe", en: "I need help" }].map((item) => <button key={item.id} onClick={() => reportMissing(`search_${item.id}`)}>{item[lang]}</button>)}</div></section>}
        {searchHistory.length > 0 && <section className="search-history" aria-label={lang === "de" ? "Letzte Suchen" : "Recent searches"}><h2>{lang === "de" ? "Letzte Suchen" : "Recent searches"}</h2><div>{searchHistory.slice(0, 5).map((item) => <article key={item.id}><span>{item.text}</span><button onClick={() => speak(item.text, `history-${item.id}`)} aria-label={lang === "de" ? "Anhören" : "Listen"}><Volume2 /></button><button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.text)}`, "_blank", "noopener,noreferrer")}><Search />{lang === "de" ? "Suchen" : "Search"}</button></article>)}</div></section>}
      </div>
      <PatientBottomBar audioMode={audioMode} audioModeLabel={audioModeLabel} onBack={searchBack} onRepeat={() => { void logInteraction("choice_repeat", "internet_search"); const current = currentSearchNodes.find((item) => item.option_key === selectedSearch) ?? currentSearchNodes[0]; if (current) { const text = lang === "de" ? current.query_de || current.label_de : current.query_en || current.label_en || current.label_de; speak(text, `search-${current.option_key}`); } }} onToggleAudio={() => { void logInteraction("audio_toggle", "internet_search"); cycleAudioMode(); }} />
    </main>
  );

  if (view === "communicate") {
    const title = commStep === "purpose" ? t.choosePurpose : commStep === "topic" ? t.chooseTopic : commStep === "detail" ? t.chooseDetail : commStep === "review" || commStep === "practice" ? t.review : commStep === "priority" ? t.choosePriority : t.sent;
    const missingChoices = commStep === "purpose"
      ? [{ id: "purpose", de: "Mein Anliegen fehlt", en: "My need is missing" }, { id: "help", de: "Ich brauche Hilfe", en: "I need help" }]
      : commStep === "topic"
        ? [{ id: "topic", de: "Mein Thema fehlt", en: "My topic is missing" }, { id: "category", de: "Andere Kategorie", en: "Another category" }, { id: "help", de: "Ich brauche Hilfe", en: "I need help" }]
        : commStep === "detail"
          ? [{ id: "answer", de: "Meine Antwort fehlt", en: "My answer is missing" }, { id: "word", de: "Wort fehlt", en: "A word is missing" }, { id: "person", de: "Person fehlt", en: "A person is missing" }, { id: "place", de: "Ort fehlt", en: "A place is missing" }, { id: "help", de: "Ich brauche Hilfe", en: "I need help" }]
          : commStep === "review"
            ? [{ id: "word", de: "Wort fehlt", en: "A word is missing" }, { id: "person", de: "Person fehlt", en: "A person is missing" }, { id: "place", de: "Ort fehlt", en: "A place is missing" }, { id: "time", de: "Zeit fehlt", en: "A time is missing" }, { id: "change", de: "Etwas ändern", en: "Change something" }]
            : [{ id: "help", de: "Ich brauche Hilfe", en: "I need help" }, { id: "selection", de: "Passende Auswahl fehlt", en: "The right choice is missing" }];
    return (
      <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>
        {shellHeader(t.communicate)}
        <div className="content-wrap communication-content">
          {commStep !== "success" && <div className="progress-row"><span className={commStep === "purpose" ? "active" : "done"}>1</span><i /><span className={commStep === "topic" ? "active" : ["detail","review","practice","priority"].includes(commStep) ? "done" : ""}>2</span><i /><span className={commStep === "detail" ? "active" : ["review","practice","priority"].includes(commStep) ? "done" : ""}>3</span><i /><span className={["review","practice","priority"].includes(commStep) ? "active" : ""}>4</span></div>}
          <div className="page-heading"><h1>{title}</h1>{["purpose","topic","detail"].includes(commStep) && <p>{t.firstTap}</p>}</div>
          {patientChoicesLoading && ["topic","detail"].includes(commStep) && <div className="choice-loading" role="status"><div className="loading-bar" /><span>{lang === "de" ? "Auswahl wird vorbereitet …" : "Preparing choices …"}</span></div>}
          {["purpose","topic","detail"].includes(commStep) && <ChoiceGrid key={`communication-${commStep}-${purpose?.id ?? "root"}-${topic?.id ?? "root"}-${choiceCount}`} choices={currentChoices} lang={lang} selected={selected} speaking={speaking} onChoose={chooseCommunication} onVisibleChoicesChange={reportVisibleChoices} count={choiceCount} />}
          {commStep !== "success" && <button className="missing-topic-button" onClick={() => setShowMissingChoices((open) => !open)} aria-expanded={showMissingChoices}><CircleHelp />{t.missingTopic}</button>}
          {showMissingChoices && commStep !== "success" && <section className="missing-choice-panel" aria-label={t.whatMissing}><h2>{t.whatMissing}</h2><div>{missingChoices.map((item) => <button key={item.id} onClick={() => void reportMissing(item.id)}>{item[lang]}</button>)}</div></section>}
          {status && view === "communicate" && commStep !== "success" && <p className="inline-status">{status}</p>}
          {commStep === "review" && detail && <section className="message-review"><div className="quote-mark">“</div><p>{detail[lang]}</p><div className="review-actions"><button onClick={() => speak(detail[lang])}><Volume2 />{t.listen}</button><button onClick={() => setCommStep("practice")}><Mic />{t.practice}</button><button onClick={() => setCommStep("detail")}><RotateCcw />{t.change}</button><button className="primary-button" onClick={() => setCommStep("priority")}><Send />{t.send}</button></div></section>}
          {commStep === "practice" && detail && <section className="practice-panel"><span className="practice-orb"><Headphones /></span><h2>{t.practiceTitle}</h2><p>{t.practiceHint}</p><blockquote>{detail[lang]}</blockquote><div className="practice-controls"><button onClick={() => speak(detail[lang])}><RotateCcw />{t.repeat}</button><button className="primary-button" onClick={() => setCommStep("priority")}><Check />{t.done}</button></div></section>}
          {commStep === "priority" && detail && <section className="priority-panel"><div className="compact-message">{detail[lang]}</div><div className="priority-grid">{(["normal","important","very_important"] as Priority[]).map((item) => <button key={item} className={`priority-card ${item} ${priority === item ? "selected" : ""}`} onClick={() => setPriority(item)} disabled={messageSending}><span />{item === "normal" ? t.normal : item === "important" ? t.important : t.veryImportant}{priority === item && <Check />}</button>)}</div>{error && <p className="form-error">{error}</p>}<button className="send-final" onClick={sendMessage} disabled={messageSending}><Send />{messageSending ? "Wird gespeichert …" : t.sendNow}</button></section>}
          {commStep === "success" && <section className="success-panel"><span className="success-check"><Check /></span><h1>{t.sent}</h1><p>{status || t.sentHint}</p><button className="primary-button" onClick={openHome}>{t.home}</button></section>}
        </div>
        {commStep !== "success" && <PatientBottomBar audioMode={audioMode} audioModeLabel={audioModeLabel} onBack={communicationBack} onRepeat={() => { void logInteraction("choice_repeat", `communicate_${commStep}`); const text = commStep === "review" || commStep === "practice" || commStep === "priority" ? detail?.[lang] : selected ? currentChoices.find((item) => item.id === selected)?.[lang] : currentChoices[0]?.[lang]; if (text) speak(text); }} onToggleAudio={() => { void logInteraction("audio_toggle", `communicate_${commStep}`); cycleAudioMode(); }} />}
      </main>
    );
  }

  if (view === "practice") {
    const fallbackItems = lang === "de"
      ? ["Bitte", "Danke", "Ich brauche eine Pause.", "Bitte bring mir etwas zu trinken.", "Mir ist kalt.", "Mir ist warm.", "Ich möchte spazieren gehen.", "Bitte sprechen Sie langsamer.", "Ich habe das verstanden.", "Ich brauche Hilfe.", "Ich möchte Musik hören.", "Bitte sagen Sie das noch einmal."]
      : ["Please", "Thank you", "I need a break.", "Please bring me something to drink.", "I am cold.", "I am warm.", "I would like to go for a walk.", "Please speak more slowly.", "I understood that.", "I need help.", "I would like to listen to music.", "Please say that again."];
    const visiblePracticeItems = practiceItems.length ? practiceItems.slice(0, choiceCount).map((entry) => lang === "de" ? entry.label_de : entry.label_en || entry.label_de) : fallbackItems.slice(0, choiceCount);
    const item = visiblePracticeItems[practiceIndex % visiblePracticeItems.length];
    return <main className="app-shell main-app practice-page" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.practice, true)}<div className="content-wrap standalone-practice"><div className="practice-heading"><span className="practice-orb"><Headphones /></span><div><p className="practice-kicker">{lang === "de" ? "Schritt für Schritt" : "Step by step"}</p><h1>{t.practiceTitle}</h1><p>{t.practiceHint}</p></div></div><div className="practice-stats" aria-label={lang === "de" ? "Übungsfortschritt" : "Practice progress"}><article className="practice-stat peach"><small>{lang === "de" ? "Heute" : "Today"}</small><strong>{practiceIndex + 1}</strong><span>{lang === "de" ? "Übung ausgewählt" : "practice selected"}</span></article><article className="practice-stat mint"><small>{lang === "de" ? "Methode" : "Method"}</small><strong><Headphones /></strong><span>{lang === "de" ? "Hören" : "Listen"}</span></article><article className="practice-stat lavender"><small>{lang === "de" ? "Nächster Schritt" : "Next step"}</small><strong><Mic /></strong><span>{lang === "de" ? "Nachsprechen" : "Repeat"}</span></article></div><section className="practice-game-card"><div><p className="practice-kicker">{lang === "de" ? "Wählen Sie einen Satz" : "Choose a phrase"}</p><h2>{lang === "de" ? `${visiblePracticeItems.length} Wörter und Sätze zum Üben` : `${visiblePracticeItems.length} words and phrases to practice`}</h2></div><div className="practice-choice-grid">{visiblePracticeItems.map((practiceItem, index) => <button key={`${practiceItem}-${index}`} className={`practice-choice ${item === practiceItem ? "selected" : ""}`} aria-pressed={item === practiceItem} onClick={() => { setPracticeIndex(index); speak(practiceItem, `practice-${index}`); }}><span>{index + 1}</span><strong>{practiceItem}</strong><Volume2 /></button>)}</div></section><blockquote>{item}</blockquote><button className="listen-large" onClick={() => speak(item)}><Volume2 />{t.listen}</button><div className="practice-controls"><button onClick={() => speak(item)}><RotateCcw />{t.repeat}</button><button className="primary-button" onClick={() => { void logInteraction("practice_completed", "practice"); setPracticeIndex((value) => value + 1); }}>{t.next}<ChevronRight /></button></div><button className="text-action" onClick={openHome}>{t.done}</button></div><PatientBottomBar audioMode={audioMode} audioModeLabel={audioModeLabel} onBack={openHome} onRepeat={() => { void logInteraction("choice_repeat", "practice"); speak(item); }} onToggleAudio={() => { void logInteraction("audio_toggle", "practice"); cycleAudioMode(); }} /></main>;
  }

  if (view === "messages") return (
    <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.messages, true)}<div className="content-wrap"><div className="page-heading"><h1>{t.messages}</h1><p>{lang === "de" ? "Ihre gesendeten Nachrichten und der Lesestatus." : "Your sent messages and read status."}</p></div>{status && <p className="inline-status" role="status">{status}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="message-list">{messages.length === 0 ? <div className="empty-state"><Bell /><h2>{t.noMessages}</h2></div> : messages.map((message) => <article className={`message-item ${message.priority}`} key={message.id}><div className="message-meta"><span>{message.priority === "normal" ? t.normal : message.priority === "important" ? t.important : t.veryImportant}</span><time>{new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(message.sent_at))}</time></div><p>{lang === "de" ? message.body_de : message.body_en}</p><div className="delivery-state">{message.message_receipts?.length ? <><Check />{t.read}</> : <><Send />{t.delivery}</>}</div>{emailDeliveryLabel(message) && <div className="delivery-state email-delivery-state"><Send />{emailDeliveryLabel(message)}</div>}<div className="message-actions"><button onClick={() => speak(lang === "de" ? message.body_de ?? "" : message.body_en ?? "") }><Volume2 />{t.listen}</button><button onClick={() => { const reused = { id: "reuse", de: message.body_de ?? "", en: message.body_en ?? "" }; setPurpose(purposes[0]); setTopic(topicsByPurpose.tell[0]); setDetail(reused); setCommStep("review"); setView("communicate"); }}><RotateCcw />{lang === "de" ? "Wieder verwenden" : "Use again"}</button>{role === "companion" && message.email_notification_deliveries?.some((delivery) => delivery.status === "failed") && <button onClick={() => void retryEmailDelivery(message)} disabled={emailSettingsBusy}><Send />E-Mail erneut versuchen</button>}</div></article>)}</div></div></main>
  );

  if (view === "settings") {
    const previewLabels = lang === "de"
      ? ["Essen", "Trinken", "Familie", "Termine", "Gefühle", "Hilfe", "Aktivitäten", "Weitere Themen", "Wetter", "Musik", "Besuch", "Pause"]
      : ["Food", "Drinks", "Family", "Appointments", "Feelings", "Help", "Activities", "More topics", "Weather", "Music", "Visit", "Break"];
    return (
      <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.settings, true)}<div className="content-wrap settings-content">
        <div className="settings-section"><h2><Volume2 />Ton und Stimme</h2>
          <button className="setting-row" onClick={() => { setAudioEnabled((v) => !v); savePreference({ speech_enabled: !audioEnabled }); }}><span><strong>{audioEnabled ? t.audioOn : t.audioOff}</strong><small>{lang === "de" ? "Eine Auswahl wird beim Antippen klar vorgelesen" : "A choice is read clearly when tapped"}</small></span><span className={`switch ${audioEnabled ? "on" : ""}`}><i /></span></button>
          <button className="setting-row" onClick={() => { const next = !autoReadChoices; setAutoReadChoices(next); savePreference({ auto_read_choices: next }); }}><span><strong>{lang === "de" ? "Hauptauswahl automatisch vorlesen" : "Read main choices automatically"}</strong><small>{lang === "de" ? "Wortnah liest die Überschrift und sichtbaren Karten nacheinander vor." : "Wortnah reads the heading and visible cards one after another."}</small></span><span className={`switch ${autoReadChoices ? "on" : ""}`}><i /></span></button>
          <div className="setting-block"><strong>{t.voice}</strong><small>{lang === "de" ? "Wortnah verwendet nur verfügbares Standarddeutsch (de-DE)." : "Wortnah uses available Standard German voices (de-DE) only."}</small><div className="option-row">{(["auto","female","male"] as VoicePreference[]).map((voice) => <button key={voice} className={voicePreference === voice ? "active" : ""} onClick={() => { setVoicePreference(voice); savePreference({ voice_name: voice === "auto" ? null : `wortnah:${voice}`, voice_locale: "de-DE" }); }}>{voice === "auto" ? t.voiceAuto : voice === "female" ? t.voiceFemale : t.voiceMale}</button>)}</div><button className="test-voice-button" onClick={() => speak(lang === "de" ? "Guten Tag. Ich spreche klar und in Ruhe." : "Hello. I speak clearly and calmly.")}><Volume2 />{t.voiceTest}</button></div>
          <div className="setting-block"><strong>{t.speechSpeed}</strong><div className="option-row">{[[0.72,t.slow],[0.82,t.clear],[0.92,t.normalSpeed]].map(([rate,label]) => <button key={String(rate)} className={speechRate === rate ? "active" : ""} onClick={() => { setSpeechRate(rate as number); savePreference({ speech_rate: rate }); }}>{label}</button>)}</div></div>
        </div>
        <div className="settings-section"><h2><Settings2 />{t.appearance}</h2>
          <div className="setting-block field-choice-setting"><strong>{t.choices}</strong><small>Wählen Sie selbst zwischen 2 und {adminChoiceMaximum} Feldern. Aktuell sind {choiceCount} Felder ausgewählt.</small><div className="option-row" aria-label="Anzahl der Felder">{allowedChoiceCounts.map((count) => <button key={count} className={choiceCount === count ? "active" : ""} aria-pressed={choiceCount === count} onClick={() => choosePatientFieldCount(count)}>{count}<span>Felder</span></button>)}</div><div className={`choice-preview preview-${choiceCount}`}>{previewLabels.slice(0, choiceCount).map((label) => <span key={label}>{label}</span>)}</div></div>
          <div className="setting-block"><strong>{t.textSize}</strong><div className="option-row">{[[1,t.standard],[1.12,t.large],[1.24,t.larger]].map(([scale,label]) => <button key={String(scale)} className={textScale === scale ? "active" : ""} onClick={() => { setTextScale(scale as number); savePreference({ text_scale: Number(scale) * 1.3 }); }}>{label}</button>)}</div></div>
        </div>
        <div className="settings-section"><h2><LockKeyhole />{t.account}</h2><button className="setting-row destructive-row" onClick={signOut}><span><strong>{t.signOut}</strong><small>{lang === "de" ? "Dieses Gerät sicher trennen" : "Disconnect this device securely"}</small></span><LogOut /></button></div>
      </div></main>
    );
  }

  const importantCount = messages.filter((message) => message.priority !== "normal").length;
  const costText = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(usageSummary.aiCostCents / 100);
  const maxDailyActivity = Math.max(1, ...usageSummary.dailyActivity.map((day) => day.count));
  const adminSectionTitle = adminSection === "overview" ? t.dashboard : adminSection === "content" ? (lang === "de" ? "Wörter und Bereiche" : "Words and sections") : adminSection === "practice" ? t.practice : adminSection === "activity" ? (lang === "de" ? "Aktivitäten" : "Activity") : t.settings;
  const selectedAdminPurpose = adminPurposeOptions.find((item) => item.option_key === selectedAdminPurposeKey) ?? null;
  const adminTopicsInPurpose = adminTopicOptions.filter((item) => item.purpose_key === selectedAdminPurposeKey);
  const selectedAdminTopic = adminTopicsInPurpose.find((item) => item.option_key === selectedAdminTopicKey) ?? null;
  const filteredTopicOptions = adminTopicOptions.filter((item) => !choiceDraft.purpose_key || item.purpose_key === choiceDraft.purpose_key);
  const adminLevelLabel = contentLevel === "purpose"
    ? (lang === "de" ? "Ebene 1 · Bereiche" : "Level 1 · Purposes")
    : contentLevel === "topic"
      ? (lang === "de" ? "Ebene 2 · Themen" : "Level 2 · Topics")
      : (lang === "de" ? "Ebene 3 · Wörter & Sätze" : "Level 3 · Words & phrases");
  const purposeLabel = (key: string | null) => {
    if (!key) return lang === "de" ? "Kommunikation" : "Communication";
    const stored = adminPurposeOptions.find((entry) => entry.option_key === key) ?? customPurposes.find((entry) => entry.option_key === key);
    const builtIn = purposes.find((entry) => entry.id === key);
    return (lang === "de" ? stored?.label_de : stored?.label_en || stored?.label_de) ?? builtIn?.[lang] ?? key;
  };
  const topicLabel = (key: string | null) => {
    if (!key) return "";
    const stored = adminTopicOptions.find((entry) => entry.option_key === key);
    const builtIn = Object.values(topicsByPurpose).flat().find((entry) => entry.id === key);
    return (lang === "de" ? stored?.label_de : stored?.label_en || stored?.label_de) ?? builtIn?.[lang] ?? key;
  };
  const adminBranchLabel = contentLevel === "purpose"
    ? (lang === "de" ? "Kommunikation" : "Communication")
    : contentLevel === "topic"
      ? purposeLabel(selectedAdminPurposeKey)
      : topicLabel(selectedAdminTopicKey);
  const adminVisibleCount = adminChoices.filter((item) => item.is_published).length;
  const adminHiddenCount = adminChoices.length - adminVisibleCount;
  const adminAddLabel = contentLevel === "purpose"
    ? (lang === "de" ? "Bereich hinzufügen" : "Add area")
    : contentLevel === "topic"
      ? (lang === "de" ? "Thema hinzufügen" : "Add topic")
      : (lang === "de" ? "Wort oder Satz hinzufügen" : "Add word or phrase");
  const adminSearchPlaceholder = contentLevel === "purpose"
    ? (lang === "de" ? "Bereich suchen …" : "Search areas …")
    : contentLevel === "topic"
      ? (lang === "de" ? "Thema suchen …" : "Search topics …")
      : (lang === "de" ? "Wort oder Satz suchen …" : "Search words or phrases …");
  const visibleAdminPreview = adminChoices.filter((item) => item.is_published).slice(0, Math.min(choiceCount, 6));
  const adminPreviewLabels = visibleAdminPreview.map((item) => lang === "de" ? item.label_de : item.label_en || item.label_de);
  const filteredAdminSearchNodes = adminSearchNodes.filter((item) => item.search_level === adminSearchLevel && (!adminSearchText.trim() || item.label_de.toLocaleLowerCase("de-DE").includes(adminSearchText.trim().toLocaleLowerCase("de-DE"))));
  const searchParentOptions = adminSearchLevel === 1 ? [] : adminSearchNodes.filter((item) => item.search_level === adminSearchLevel - 1);
  const searchNodeLabel = (key: string | null) => {
    if (!key) return lang === "de" ? "Internet suchen" : "Search the internet";
    const item = adminSearchNodes.find((node) => node.option_key === key);
    return item ? (lang === "de" ? item.label_de : item.label_en || item.label_de) : key;
  };
  const adminSearchPreviewLabels = filteredAdminSearchNodes.filter((item) => item.is_published).slice(0, Math.min(choiceCount, 6)).map((item) => lang === "de" ? item.label_de : item.label_en || item.label_de);
  const activityLabel = (event: ActivityEvent) => {
    const de: Record<string, string> = { screen_view: "Seite geöffnet", choice_preview: "Auswahl angehört", choice_confirm: "Auswahl bestätigt", choice_repeat: "Audio wiederholt", back: "Zurück gegangen", audio_toggle: "Ton geändert", practice_started: "Übung begonnen", practice_completed: "Übung abgeschlossen", help_requested: "Fehlende Auswahl gemeldet", message_sent: "Nachricht gesendet" };
    const en: Record<string, string> = { screen_view: "Opened page", choice_preview: "Previewed choice", choice_confirm: "Confirmed choice", choice_repeat: "Repeated audio", back: "Went back", audio_toggle: "Changed sound", practice_started: "Started practice", practice_completed: "Completed practice", help_requested: "Reported missing choice", message_sent: "Sent message" };
    return (lang === "de" ? de : en)[event.event_type] ?? event.event_type.replaceAll("_", " ");
  };
  const adminNav = (
    <aside className="admin-sidebar"><nav>
      <button className={adminSection === "overview" ? "active" : ""} onClick={() => setAdminSection("overview")}><BarChart3 />{t.dashboard}</button>
      <button className={adminSection === "content" ? "active" : ""} onClick={() => setAdminSection("content")}><Layers3 />{lang === "de" ? "Inhalte" : "Content"}</button>
      <button className={adminSection === "practice" ? "active" : ""} onClick={() => setAdminSection("practice")}><BookOpen />{t.practice}</button>
      <button className={adminSection === "activity" ? "active" : ""} onClick={() => setAdminSection("activity")}><ClipboardCheck />{lang === "de" ? "Verlauf" : "Activity"}</button>
      <button onClick={() => setView("messages")}><Bell />{t.messages}</button>
      <button className={adminSection === "settings" ? "active" : ""} onClick={() => setAdminSection("settings")}><Settings2 />{t.settings}</button>
    </nav><button className="text-action" onClick={signOut}><LogOut />{t.signOut}</button></aside>
  );
  return (
    <main className="app-shell main-app admin-app">
      {shellHeader(t.companion)}
      <div className="admin-layout">
        {adminNav}
        <div className="admin-main">
          <div className="admin-title"><div><span className="mode-pill">{demo ? t.demoMode : t.liveMode}</span><h1>{adminSectionTitle}</h1><p>{adminSection === "overview" ? (lang === "de" ? "Ein ruhiger Überblick über Kommunikation und Nutzung." : "A calm overview of communication and usage.") : adminSection === "content" ? (lang === "de" ? "Bestimmen Sie, welche Auswahl Werner sieht." : "Control which choices Werner sees.") : adminSection === "practice" ? (lang === "de" ? "Wörter und Sätze für das selbstständige Üben." : "Words and phrases for independent practice.") : adminSection === "activity" ? (lang === "de" ? "Die letzten Schritte in zeitlicher Reihenfolge." : "Recent actions in chronological order.") : (lang === "de" ? "Legen Sie die Unterstützung für Werner fest." : "Set Werner's support level.")}</p></div><div className="connection-pill"><span className={online ? "online" : "offline"} />{online ? t.online : t.offline}</div></div>

          {adminSection === "overview" && <>
            <section className="kpi-grid"><article><span className="kpi-icon blue"><MessageCircle /></span><div><strong>{usageSummary.messagesThisWeek}</strong><small>{t.messagesWeek}</small></div></article><article><span className="kpi-icon green"><Check /></span><div><strong>{usageSummary.activeDays}</strong><small>{t.activeDays}</small></div></article><article><span className="kpi-icon amber"><Bell /></span><div><strong>{importantCount}</strong><small>{t.kpiImportant}</small></div></article><article><span className="kpi-icon blue"><CircleHelp /></span><div><strong>{usageSummary.missingThisWeek}</strong><small>{t.missingReports}</small></div></article></section>
            <div className="admin-columns"><section className="admin-panel"><div className="panel-heading"><div><h2>{t.messages}</h2><p>{lang === "de" ? "Neueste zuerst" : "Newest first"}</p></div><Bell /></div><div className="compact-list">{messages.length === 0 ? <p className="quiet-empty">{t.noMessages}</p> : messages.slice(0,5).map((message) => <article key={message.id}><div><span className={`priority-dot ${message.priority}`} /> <time>{new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.sent_at))}</time></div><p>{lang === "de" ? message.body_de : message.body_en}</p>{message.message_receipts?.length ? <span className="read-label"><Check />{t.read}</span> : <button className="read-button" onClick={() => markRead(message)}>{t.markRead}</button>}</article>)}</div></section><section className="admin-panel access-panel"><div className="panel-heading"><div><h2>{lang === "de" ? "Zugangsprofile" : "Access profiles"}</h2><p>{lang === "de" ? "Drei aktive Profile" : "Three active profiles"}</p></div><Users /></div><div className="profile-status-list"><span><UserRound /><strong>Werner</strong><small>{lang === "de" ? "Nutzer" : "User"}</small></span><span><ShieldCheck /><strong>Admin 1</strong><small>{lang === "de" ? "Begleitung" : "Companion"}</small></span><span><ShieldCheck /><strong>Admin 2</strong><small>{lang === "de" ? "Begleitung" : "Companion"}</small></span></div><div className="recommendation-block"><h3><Sparkles />{t.recommendations}</h3><p>{usageSummary.missingThisWeek ? (lang === "de" ? "Prüfen Sie die gemeldeten Lücken und ergänzen Sie passende Wörter unter Inhalte." : "Review reported gaps and add suitable words under Content.") : t.noRecommendations}</p></div></section></div>
            <section className="usage-panels"><article className="admin-panel cost-controller-panel"><div className="panel-heading"><div><h2>{t.aiController}</h2><p>{usageSummary.budget.ai_enabled ? t.aiUsage : t.aiManualOnly}</p></div><ShieldCheck /></div><div className="controller-status"><strong>{usageSummary.budget.ai_enabled ? t.aiUsage : t.aiLocked}</strong><span>{usageSummary.budget.ai_enabled ? t.aiManualOnly : lang === "de" ? "Normale Wortnah-Nutzung verwendet keine KI-Tokens." : "Normal Wortnah use does not use AI tokens."}</span></div><dl><div><dt>{lang === "de" ? "Anfragen" : "Requests"}</dt><dd>{usageSummary.aiRequests} / {usageSummary.budget.monthly_request_limit}</dd></div><div><dt>Tokens</dt><dd>{usageSummary.aiInputTokens + usageSummary.aiOutputTokens}</dd></div><div><dt>{lang === "de" ? "Kosten" : "Cost"}</dt><dd>{costText} / {new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(usageSummary.budget.monthly_cost_limit_cents / 100)}</dd></div></dl></article><article className="admin-panel usage-trend-panel"><div className="panel-heading"><div><h2>{t.usageOverTime}</h2><p>{usageSummary.startedAt ? (lang === "de" ? "Seit der ersten echten Nutzung" : "Since first real use") : (lang === "de" ? "Beginnt mit der ersten echten Nutzung" : "Begins with first real use")}</p></div><BarChart3 /></div>{usageSummary.dailyActivity.length ? <div className="usage-bars">{usageSummary.dailyActivity.map((day) => <div key={day.label}><i style={{ height: `${Math.max(6, (day.count / maxDailyActivity) * 100)}%` }} /><span>{day.label}</span><b>{day.count}</b></div>)}</div> : <p className="quiet-empty">{lang === "de" ? "Noch keine reale Nutzung erfasst." : "No real usage recorded yet."}</p>}</article></section>
          </>}

          {adminSection === "content" && <>
          <div className="content-area-switch" role="tablist" aria-label={lang === "de" ? "Inhaltsbereich" : "Content area"}><button role="tab" aria-selected={contentArea === "communication"} className={contentArea === "communication" ? "active" : ""} onClick={() => { setContentArea("communication"); closeSearchEditor(); }}><MessageCircle />{lang === "de" ? "Kommunikation" : "Communication"}</button><button role="tab" aria-selected={contentArea === "search"} className={contentArea === "search" ? "active" : ""} onClick={() => { setContentArea("search"); closeChoiceEditor(); }}><Search />{t.search}</button></div>
          {contentArea === "communication" && <section className="admin-panel content-manager communication-manager">
            <div className="content-context-header">
              <nav className="admin-breadcrumb" aria-label={lang === "de" ? "Aktueller Bereich" : "Current location"}>
                <House /><button type="button" onClick={() => setAdminSection("overview")}>{t.dashboard}</button><ChevronRight />
                <button type="button" onClick={() => { setContentLevel("purpose"); setContentSearch(""); closeChoiceEditor(); }}>{lang === "de" ? "Kommunikation" : "Communication"}</button><ChevronRight />
                <button type="button" onClick={() => { setContentLevel(contentLevel); setContentSearch(""); closeChoiceEditor(); }}>{adminLevelLabel}</button>
                {contentLevel !== "purpose" && <><ChevronRight /><button type="button" onClick={() => { setContentLevel("topic"); setContentSearch(""); closeChoiceEditor(); }}>{purposeLabel(selectedAdminPurposeKey)}</button></>}
                {contentLevel === "detail" && <><ChevronRight /><strong>{topicLabel(selectedAdminTopicKey)}</strong></>}
              </nav>
              <span className="level-badge">{adminLevelLabel}</span>
            </div>
            <section className="admin-patient-preview" aria-label={lang === "de" ? "Vorschau für Werner" : "Preview for Werner"}>
              <div><Eye /><span><strong>{lang === "de" ? `So sieht Werner „${adminBranchLabel}“` : `How Werner sees “${adminBranchLabel}”`}</strong><small>{lang === "de" ? `${adminVisibleCount} sichtbar · Vorschau zeigt höchstens ${Math.min(choiceCount, 6)} Felder` : `${adminVisibleCount} visible · Preview shows up to ${Math.min(choiceCount, 6)} choices`}</small></span></div>
              <div className="admin-preview-chips">{adminPreviewLabels.length ? adminPreviewLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <small>{lang === "de" ? "In dieser Auswahl ist noch nichts für Werner sichtbar." : "Nothing in this selection is visible to Werner yet."}</small>}</div>
            </section>
            <div className="content-toolbar">
              <div className="segment-control">{(["purpose","topic","detail"] as ChoiceLevel[]).map((level, index) => <button key={level} aria-pressed={contentLevel === level} className={contentLevel === level ? "active" : ""} onClick={() => { setContentLevel(level); setContentSearch(""); closeChoiceEditor(); }}><small>{lang === "de" ? "Ebene" : "Level"} {index + 1}</small>{level === "purpose" ? (lang === "de" ? "Bereiche" : "Purposes") : level === "topic" ? (lang === "de" ? "Themen" : "Topics") : (lang === "de" ? "Wörter & Sätze" : "Words & phrases")}</button>)}</div>
            </div>
            <div className={`content-branch-toolbar level-${contentLevel}`}>
              {contentLevel !== "purpose" && <label className="content-branch-field"><span>{lang === "de" ? "Bereich auswählen" : "Choose area"}</span><select value={selectedAdminPurpose?.option_key ?? ""} onChange={(event) => { const nextPurpose = event.target.value; setSelectedAdminPurposeKey(nextPurpose); const firstTopic = adminTopicOptions.find((item) => item.purpose_key === nextPurpose); setSelectedAdminTopicKey(firstTopic?.option_key ?? ""); setContentSearch(""); closeChoiceEditor(); }}>{adminPurposeOptions.map((item) => <option key={item.id} value={item.option_key}>{lang === "de" ? item.label_de : item.label_en || item.label_de}{item.is_published ? "" : lang === "de" ? " · ausgeblendet" : " · hidden"}</option>)}</select></label>}
              {contentLevel === "detail" && <label className="content-branch-field"><span>{lang === "de" ? "Thema auswählen" : "Choose topic"}</span><select value={selectedAdminTopic?.option_key ?? ""} onChange={(event) => { setSelectedAdminTopicKey(event.target.value); setContentSearch(""); closeChoiceEditor(); }}>{adminTopicsInPurpose.map((item) => <option key={item.id} value={item.option_key}>{lang === "de" ? item.label_de : item.label_en || item.label_de}{item.is_published ? "" : lang === "de" ? " · ausgeblendet" : " · hidden"}</option>)}</select></label>}
              <label className="content-branch-field branch-search"><span>{lang === "de" ? "In dieser Auswahl suchen" : "Search this selection"}</span><span className="admin-search"><Search /><input value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} placeholder={adminSearchPlaceholder} /></span></label>
              <button className="primary-button branch-add" onClick={() => startChoiceEditor()} disabled={editorBusy || (contentLevel === "topic" && !selectedAdminPurpose) || (contentLevel === "detail" && !selectedAdminTopic)}><Plus />{adminAddLabel}</button>
            </div>
            {editorNotice && <p className="editor-notice" role="status"><Check />{editorNotice}</p>}
            {(creatingChoice || editingChoice) && <div className="editor-card">
              <div className="editor-heading"><div><span className="level-badge">{adminLevelLabel}</span><h2>{editingChoice ? "Eintrag bearbeiten" : adminAddLabel}</h2><p>{purposeLabel(contentLevel === "purpose" ? null : choiceDraft.purpose_key)}{contentLevel === "detail" && choiceDraft.topic_key ? ` › ${topicLabel(choiceDraft.topic_key)}` : ""}</p></div><button className="editor-cancel" onClick={closeChoiceEditor} disabled={editorBusy}>Abbrechen</button></div>
              <div className="editor-workspace"><div className="editor-grid"><label className="editor-primary-field">Deutscher Text<input value={choiceDraft.label_de} onChange={(event) => setChoiceDraft((draft) => ({ ...draft, label_de: event.target.value }))} placeholder={contentLevel === "detail" ? "Zum Beispiel: Bitte bring mir Wasser." : "Bezeichnung für Werner"} autoFocus /></label>{contentLevel !== "purpose" && <label>Bereich<select value={choiceDraft.purpose_key} onChange={(event) => setChoiceDraft((draft) => ({ ...draft, purpose_key: event.target.value, topic_key: "" }))}>{purposes.map((item) => <option key={item.id} value={item.id}>{item.de}</option>)}{customPurposes.map((item) => <option key={item.id} value={item.option_key}>{item.label_de}</option>)}</select></label>}{contentLevel === "detail" && <label>Thema<select value={choiceDraft.topic_key} onChange={(event) => setChoiceDraft((draft) => ({ ...draft, topic_key: event.target.value }))}><option value="">Thema wählen</option>{filteredTopicOptions.map((item) => <option key={item.id} value={item.option_key}>{item.label_de}</option>)}</select></label>}<label>Reihenfolge<input type="number" min="0" value={choiceDraft.sort_order} onChange={(event) => setChoiceDraft((draft) => ({ ...draft, sort_order: Number(event.target.value) }))} /></label><label>Priorität<select value={choiceDraft.priority} onChange={(event) => setChoiceDraft((draft) => ({ ...draft, priority: event.target.value as CustomChoice["priority"] }))}><option value="high">Hoch</option><option value="medium">Mittel</option><option value="low">Niedrig</option></select></label></div><aside className="editor-preview"><span>Vorschau für Werner</span><strong>{choiceDraft.label_de.trim() || "Ihr deutscher Text"}</strong><small>{choiceDraft.is_published ? "Sichtbar" : "Ausgeblendet"} · {adminLevelLabel}</small></aside></div>
              <div className="editor-actions"><div className="editor-toggles"><button className={choiceDraft.is_published ? "on" : ""} onClick={() => setChoiceDraft((draft) => ({ ...draft, is_published: !draft.is_published }))} disabled={editorBusy}>{choiceDraft.is_published ? <Eye /> : <EyeOff />}Für Werner sichtbar</button>{contentLevel === "detail" && <button className={choiceDraft.practice_eligible ? "on" : ""} onClick={() => setChoiceDraft((draft) => ({ ...draft, practice_eligible: !draft.practice_eligible }))} disabled={editorBusy}>{choiceDraft.practice_eligible ? <ToggleRight /> : <ToggleLeft />}Auch zum Üben</button>}</div><button className="primary-button save-editor" onClick={saveChoice} disabled={editorBusy}><Check />{editorBusy ? "Wird gespeichert …" : "Speichern"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}
            </div>}
            <div className="manager-summary"><div><strong>{contentLoading ? "…" : adminChoices.length}</strong><span>{lang === "de" ? `${contentLevel === "purpose" ? "Bereiche" : contentLevel === "topic" ? "Themen" : "Wörter und Sätze"} in dieser Auswahl` : `entries in this selection`}</span></div>{!contentLoading && <small>{adminVisibleCount} sichtbar{adminHiddenCount ? ` · ${adminHiddenCount} ausgeblendet` : ""}</small>}</div>
            <div className="manager-list">{!contentLoading && adminChoices.length === 0 ? <div className="manager-empty"><p>{contentSearch.trim() ? (lang === "de" ? "Keine passenden Einträge in dieser Auswahl gefunden." : "No matching entries in this selection.") : (lang === "de" ? "In dieser Auswahl sind noch keine Einträge vorhanden." : "There are no entries in this selection yet.")}</p>{!contentSearch.trim() && <button className="primary-button" onClick={() => startChoiceEditor()} disabled={editorBusy}><Plus />{adminAddLabel}</button>}</div> : adminChoices.map((item, index) => <article key={item.id} className={!item.is_published ? "hidden-item" : ""}>
              <GripVertical className="drag-handle" aria-hidden="true" />
              <button className="publish-toggle" onClick={() => void toggleChoicePublished(item)} disabled={editorBusy} aria-label={item.is_published ? (lang === "de" ? "Ausblenden" : "Hide") : (lang === "de" ? "Einblenden" : "Show")}>{item.is_published ? <Eye /> : <EyeOff />}</button>
              <div><strong>{item.label_de}</strong><small>{purposeLabel(item.purpose_key)}{item.topic_key ? ` › ${topicLabel(item.topic_key)}` : ""}</small></div>
              <div className="reorder-actions"><button onClick={() => void moveChoice(item, -1)} disabled={editorBusy || Boolean(contentSearch.trim()) || index === 0} aria-label={lang === "de" ? "Nach oben" : "Move up"}><ArrowUp /></button><button onClick={() => void moveChoice(item, 1)} disabled={editorBusy || Boolean(contentSearch.trim()) || index === adminChoices.length - 1} aria-label={lang === "de" ? "Nach unten" : "Move down"}><ArrowDown /></button></div>
              <span className={`priority-tag ${item.priority}`}>{item.priority}</span><div className="row-management-actions">{contentLevel === "topic" && <button className="icon-action folder-action" onClick={() => { setSelectedAdminTopicKey(item.option_key); setContentLevel("detail"); setContentSearch(""); closeChoiceEditor(); }} disabled={editorBusy} aria-label={lang === "de" ? `„${item.label_de}“ öffnen` : `Open “${item.label_de}”`}><FolderOpen /></button>}<button className="icon-action" onClick={() => startChoiceEditor(item)} disabled={editorBusy} aria-label={lang === "de" ? "Bearbeiten" : "Edit"}><Pencil /></button><button className="icon-action danger" onClick={() => void deleteChoice(item)} disabled={editorBusy} aria-label={lang === "de" ? "Löschen" : "Delete"}><Trash2 /></button></div>
            </article>)}</div>
          </section>}

          {contentArea === "search" && <section className="admin-panel content-manager search-manager">
            <div className="content-context-header">
              <nav className="admin-breadcrumb" aria-label={lang === "de" ? "Aktueller Bereich" : "Current location"}><House /><span>{t.dashboard}</span><ChevronRight /><span>{t.search}</span><ChevronRight /><strong>{lang === "de" ? `Ebene ${adminSearchLevel}` : `Level ${adminSearchLevel}`}</strong></nav>
              <span className="level-badge">{lang === "de" ? `Ebene ${adminSearchLevel} von 4` : `Level ${adminSearchLevel} of 4`}</span>
            </div>
            <section className="admin-patient-preview" aria-label={lang === "de" ? "Vorschau für Werner" : "Preview for Werner"}>
              <div><Eye /><span><strong>{lang === "de" ? "So sieht Werner diese Suchebene" : "How Werner sees this search level"}</strong><small>{lang === "de" ? `Vorschau mit ${choiceCount} Feldern` : `Preview with ${choiceCount} choices`}</small></span></div>
              <div className="admin-preview-chips">{adminSearchPreviewLabels.length ? adminSearchPreviewLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <small>{lang === "de" ? "Keine sichtbaren Einträge auf dieser Ebene." : "No visible entries on this level."}</small>}</div>
            </section>
            <div className="content-toolbar">
              <div className="segment-control search-level-tabs">{([1,2,3,4] as const).map((level) => <button key={level} className={adminSearchLevel === level ? "active" : ""} onClick={() => { setAdminSearchLevel(level); closeSearchEditor(); }}><small>{lang === "de" ? "Ebene" : "Level"}</small>{level}</button>)}</div>
              <div className="content-actions"><label className="admin-search"><Search /><input value={adminSearchText} onChange={(event) => setAdminSearchText(event.target.value)} placeholder={lang === "de" ? "Suchbegriff finden …" : "Find search entry …"} /></label><button className="primary-button" onClick={() => startSearchEditor()}><Plus />{lang === "de" ? "Suchbegriff hinzufügen" : "Add search entry"}</button></div>
            </div>
            {editorNotice && <p className="editor-notice" role="status"><Check />{editorNotice}</p>}
            {(creatingSearchNode || editingSearchNode) && <div className="editor-card">
              <div className="editor-heading"><div><span className="level-badge">Ebene {adminSearchLevel}</span><h2>{editingSearchNode ? "Sucheintrag bearbeiten" : "Sucheintrag hinzufügen"}</h2><p>{searchNodeLabel(adminSearchLevel === 1 ? null : searchDraft.parent_key)}</p></div><button className="editor-cancel" onClick={closeSearchEditor} disabled={editorBusy}>Abbrechen</button></div>
              <div className="editor-workspace"><div className="editor-grid"><label className="editor-primary-field">Deutsche Bezeichnung<input value={searchDraft.label_de} onChange={(event) => setSearchDraft((draft) => ({ ...draft, label_de: event.target.value }))} placeholder="Kurze Auswahl für Werner" autoFocus /></label>{adminSearchLevel > 1 && <label>Übergeordneter Bereich<select value={searchDraft.parent_key} onChange={(event) => setSearchDraft((draft) => ({ ...draft, parent_key: event.target.value }))}><option value="">Bereich wählen</option>{searchParentOptions.map((item) => <option key={item.option_key} value={item.option_key}>{item.label_de}</option>)}</select></label>}<label>Reihenfolge<input type="number" min="0" value={searchDraft.sort_order} onChange={(event) => setSearchDraft((draft) => ({ ...draft, sort_order: Number(event.target.value) }))} /></label><label className="editor-primary-field">Fertiger deutscher Suchsatz<small className="field-help">Nur bei einem letzten Schritt eintragen. Sonst führt die Auswahl zur nächsten Ebene.</small><input value={searchDraft.query_de} onChange={(event) => setSearchDraft((draft) => ({ ...draft, query_de: event.target.value }))} placeholder="Zum Beispiel: Wetter heute in Berlin" /></label></div><aside className="editor-preview"><span>Vorschau für Werner</span><strong>{searchDraft.label_de.trim() || "Ihre Auswahl"}</strong><small>{searchDraft.query_de.trim() ? `Sucht nach: ${searchDraft.query_de.trim()}` : "Führt zur nächsten Ebene"}</small></aside></div>
              <div className="editor-actions"><div className="editor-toggles"><button className={searchDraft.is_published ? "on" : ""} onClick={() => setSearchDraft((draft) => ({ ...draft, is_published: !draft.is_published }))} disabled={editorBusy}>{searchDraft.is_published ? <Eye /> : <EyeOff />}Für Werner sichtbar</button></div><button className="primary-button save-editor" onClick={saveSearchNode} disabled={editorBusy}><Check />{editorBusy ? "Wird gespeichert …" : "Speichern"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}
            </div>}
            <div className="manager-summary"><strong>{contentLoading ? "…" : filteredAdminSearchNodes.length}</strong><span>{lang === "de" ? `Einträge auf Ebene ${adminSearchLevel}` : `entries on level ${adminSearchLevel}`}</span></div>
            <div className="manager-list search-manager-list">{!contentLoading && filteredAdminSearchNodes.length === 0 ? <p className="quiet-empty">{lang === "de" ? "Keine Einträge gefunden." : "No entries found."}</p> : filteredAdminSearchNodes.map((item) => <article key={item.id} className={!item.is_published ? "hidden-item" : ""}><button className="publish-toggle" onClick={() => toggleSearchPublished(item)} aria-label={item.is_published ? (lang === "de" ? "Ausblenden" : "Hide") : (lang === "de" ? "Einblenden" : "Show")}>{item.is_published ? <Eye /> : <EyeOff />}</button><div><strong>{item.label_de}</strong><small>{adminSearchLevel > 1 ? `${searchNodeLabel(item.parent_key)} · ` : ""}{item.query_de || (lang === "de" ? "Weiter zur nächsten Ebene" : "Continues to the next level")}</small></div><button className="icon-action" onClick={() => startSearchEditor(item)} aria-label={lang === "de" ? "Bearbeiten" : "Edit"}><Pencil /></button><button className="icon-action danger" onClick={() => deleteSearchNode(item)} aria-label={lang === "de" ? "Löschen" : "Delete"}><Trash2 /></button></article>)}</div>
          </section>}
          </>}

          {adminSection === "practice" && <section className="admin-panel content-manager"><div className="content-toolbar"><div><h2>Übungsinhalte</h2><p>{practiceItems.length} Wörter und Sätze</p></div><button className="primary-button" onClick={() => { setEditorNotice(""); startPracticeEditor(); }}><Plus />Neue Übung</button></div>{editorNotice && <p className="editor-notice" role="status"><Check />{editorNotice}</p>}{(creatingPractice || editingPractice) && <div className="editor-card"><div className="editor-heading"><div><span className="level-badge">Üben</span><h2>{editingPractice ? "Übung bearbeiten" : "Übung hinzufügen"}</h2></div><button className="editor-cancel" onClick={closePracticeEditor} disabled={editorBusy}>Abbrechen</button></div><div className="editor-workspace"><div className="editor-grid"><label className="editor-primary-field">Deutscher Übungstext<input value={practiceDraft.label_de} onChange={(event) => setPracticeDraft((draft) => ({ ...draft, label_de: event.target.value }))} placeholder="Wort oder kurzer Satz" autoFocus /></label><label>Schwierigkeit<select value={practiceDraft.difficulty} onChange={(event) => setPracticeDraft((draft) => ({ ...draft, difficulty: event.target.value as PracticeItem["difficulty"] }))}><option value="easy">Leicht</option><option value="medium">Mittel</option></select></label><label>Reihenfolge<input type="number" min="0" value={practiceDraft.sort_order} onChange={(event) => setPracticeDraft((draft) => ({ ...draft, sort_order: Number(event.target.value) }))} /></label></div><aside className="editor-preview"><span>Vorschau für Werner</span><strong>{practiceDraft.label_de.trim() || "Ihr Übungstext"}</strong><small>{practiceDraft.difficulty === "easy" ? "Leicht" : "Mittel"}</small></aside></div><div className="editor-actions"><span className="editor-guidance">Deutsch ist für diese Version die einzige sichtbare Sprache.</span><button className="primary-button save-editor" onClick={savePracticeItem} disabled={editorBusy}><Check />{editorBusy ? "Wird gespeichert …" : "Speichern"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}</div>}<div className="manager-list practice-manager-list">{practiceItems.map((item) => <article key={item.id}><button className="practice-preview" onClick={() => speak(item.label_de)} aria-label="Anhören"><Volume2 /></button><div><strong>{item.label_de}</strong><small>Übung · {item.difficulty === "easy" ? "leicht" : "mittel"}</small></div><span className={`difficulty-tag ${item.difficulty}`}>{item.difficulty === "easy" ? "Leicht" : "Mittel"}</span><button className="icon-action" onClick={() => startPracticeEditor(item)} aria-label="Bearbeiten"><Pencil /></button><button className="icon-action danger" onClick={() => deletePracticeItem(item)} aria-label="Löschen"><Trash2 /></button></article>)}</div></section>}

          {adminSection === "activity" && <section className="admin-panel activity-panel"><div className="panel-heading"><div><h2>{lang === "de" ? "Aktivitätsverlauf" : "Activity timeline"}</h2><p>{lang === "de" ? "Neueste Aktivität zuerst" : "Newest activity first"}</p></div><ClipboardCheck /></div><div className="activity-timeline">{activityEvents.length === 0 ? <p className="quiet-empty">{lang === "de" ? "Noch keine Aktivität erfasst." : "No activity recorded yet."}</p> : activityEvents.map((event) => <article key={event.id}><span className={`activity-dot ${event.event_type}`} /><div><strong>{activityLabel(event)}</strong><small>{event.screen_key ? event.screen_key.replaceAll("_", " ") : (lang === "de" ? "Wortnah" : "Wortnah")}</small></div><time>{new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</time></article>)}</div></section>}

          {adminSection === "settings" && <div className="admin-settings-stack">
            <section className="admin-panel admin-settings-panel"><div className="panel-heading"><div><h2>Maximale Auswahl</h2><p>Werner wählt selbst 2, 4, 6, 8, 10 oder 12 Felder – bis zu Ihrem Maximum.</p></div><Settings2 /></div><div className="maximum-choice-grid">{availablePatientChoiceCounts(DEFAULT_ADMIN_CHOICE_MAXIMUM).map((count) => <button key={count} className={adminChoiceMaximum === count ? "active" : ""} aria-pressed={adminChoiceMaximum === count} disabled={settingsBusy} onClick={() => void saveAdminChoiceMaximum(count)}><strong>{count}</strong><span>Felder</span></button>)}</div>{settingsBusy && <p className="settings-saving" role="status">Einstellung wird gespeichert …</p>}{editorNotice && <p className="editor-notice" role="status"><Check />{editorNotice}</p>}<div className="settings-note"><ShieldCheck /><p>Die Einstellung gilt gemeinsam für Kommunikation, Internetsuche und Üben. Werner kann seine eigene Zahl jederzeit in „Meine Einstellungen“ oder oben in der Leiste ändern.</p></div></section>
            <section className="admin-panel admin-settings-panel email-settings-panel"><div className="panel-heading"><div><h2>E-Mail-Benachrichtigungen</h2><p>Nur wichtige und sehr wichtige Mitteilungen. Normale Mitteilungen werden nie per E-Mail gesendet.</p></div><Bell /></div>
              <div className="email-recipient-form"><label><span>E-Mail-Adresse</span><input type="email" value={emailRecipientDraft} onChange={(event) => setEmailRecipientDraft(event.target.value)} placeholder="name@beispiel.de" disabled={emailSettingsBusy || emailRecipients.length >= 3} /></label><label className="consent-check"><input type="checkbox" checked={emailRecipientConsent} onChange={(event) => setEmailRecipientConsent(event.target.checked)} disabled={emailSettingsBusy || emailRecipients.length >= 3} /><span>Die empfangende Person hat dieser Benachrichtigung zugestimmt.</span></label><button className="primary-button" onClick={() => void addEmailRecipient()} disabled={emailSettingsBusy || emailRecipients.length >= 3}><Plus />Empfänger hinzufügen</button></div>
              <div className="email-recipient-list">{emailRecipients.length === 0 ? <p className="quiet-empty">Noch keine E-Mail-Benachrichtigung eingeschaltet.</p> : emailRecipients.map((recipient) => <article key={recipient.id}><div><strong>{recipient.email}</strong><small>{recipient.enabled ? "Wichtig und sehr wichtig · Eingeschaltet" : "Ausgeschaltet"}</small></div><button className={`recipient-toggle ${recipient.enabled ? "on" : ""}`} onClick={() => void toggleEmailRecipient(recipient)} disabled={emailSettingsBusy} aria-pressed={recipient.enabled}>{recipient.enabled ? "Ein" : "Aus"}</button><button className="icon-action test-email-action" onClick={() => void sendEmailRecipientTest(recipient)} disabled={emailSettingsBusy || !recipient.enabled} aria-label={`Test-E-Mail an ${recipient.email} senden`}><Send /></button><button className="icon-action danger" onClick={() => void removeEmailRecipient(recipient)} disabled={emailSettingsBusy} aria-label={`${recipient.email} entfernen`}><Trash2 /></button></article>)}</div>
              <div className="settings-note"><ShieldCheck /><p>Die Gmail-Zugangsdaten bleiben ausschließlich in Supabase. Gesendete, erneut versuchte und fehlgeschlagene Zustände werden für Begleitung protokolliert.</p></div>{emailSettingsNotice && <p className="editor-notice" role="status"><Check />{emailSettingsNotice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
            </section>
          </div>}
        </div>
      </div>
    </main>
  );
}
