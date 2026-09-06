"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Headphones,
  Heart,
  House,
  Languages,
  LockKeyhole,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Mic,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
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
  normalizePatientChoiceCount,
} from "@/lib/choice-policy";
import { supabase } from "@/lib/supabase";

type Lang = "de" | "en";
type Role = "user" | "companion";
type View = "welcome" | "login" | "onboarding" | "pin" | "home" | "communicate" | "practice" | "messages" | "admin" | "settings";
type CommStep = "purpose" | "topic" | "detail" | "review" | "practice" | "priority" | "success";
type Priority = "normal" | "important" | "very_important";
type VoicePreference = "auto" | "female" | "male";

type Member = { space_id: string; profile_id: string; role: Role; label: string };
type Choice = { id: string; de: string; en: string; icon?: typeof MessageCircle };
type Receipt = { read_at: string; profile_id: string };
type AppMessage = {
  id: string;
  body_de: string | null;
  body_en: string | null;
  priority: Priority;
  sent_at: string;
  sender_profile_id: string;
  message_receipts?: Receipt[];
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
    communicate: "Kommunizieren", practice: "Üben", messages: "Mitteilungen", settings: "Meine Einstellungen",
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
    communicate: "Communicate", practice: "Practice", messages: "Messages", settings: "My settings",
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
  return <span className="wordmark"><span className="wordmark-mark" aria-hidden="true">W</span><span>Wortnah</span></span>;
}

function PinPad({ title, hint, error, onComplete, onBack }: { title: string; hint: string; error?: string; onComplete: (pin: string) => void; onBack: () => void }) {
  const [pin, setPin] = useState("");
  const add = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) window.setTimeout(() => onComplete(next), 120);
  };
  return (
    <div className="centered-panel">
      <button className="text-action back-action" onClick={onBack}><ArrowLeft /> Zurück</button>
      <div className="pin-card">
        <div className="pin-icon"><LockKeyhole /></div>
        <h1>{title}</h1><p>{hint}</p>
        <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={onComplete} inputMode="numeric" aria-label={title}>
          <InputOTPGroup className="otp-group">
            {[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} className="otp-slot" />)}
          </InputOTPGroup>
        </InputOTP>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="keypad" aria-label="Ziffernblock">
          {["1","2","3","4","5","6","7","8","9"].map((digit) => <button key={digit} onClick={() => add(digit)}>{digit}</button>)}
          <button aria-label="PIN löschen" onClick={() => setPin("")}><RotateCcw /></button>
          <button onClick={() => add("0")}>0</button>
          <button aria-label="Letzte Ziffer löschen" onClick={() => setPin((value) => value.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  );
}

function ChoiceGrid({ choices, lang, selected, speaking, onChoose, count = 4 }: { choices: Choice[]; lang: Lang; selected: string | null; speaking: string | null; onChoose: (choice: Choice) => void; count?: number }) {
  return (
    <div className={`choice-grid choice-count-${Math.min(count, choices.length)}`}>
      {choices.slice(0, count).map((choice, index) => {
        const Icon = choice.icon;
        const active = selected === choice.id;
        return (
          <button key={choice.id} className={`choice-card ${active ? "selected" : ""} ${speaking === choice.id ? "speaking" : ""}`} onClick={() => onChoose(choice)} aria-pressed={active}>
            <span className="choice-number">{index + 1}</span>
            {Icon && <span className="choice-icon"><Icon /></span>}
            <span>{choice[lang]}</span>
            {active && <span className="choice-confirm"><Check /> {lang === "de" ? "Noch einmal" : "Tap again"}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function WortnahApp() {
  const [lang, setLang] = useState<Lang>("de");
  const t = copy[lang];
  const [view, setView] = useState<View>("welcome");
  const [role, setRole] = useState<Role | null>(null);
  const [desiredRole, setDesiredRole] = useState<Role>("user");
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [booting, setBooting] = useState(true);
  const [demo, setDemo] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pinMode, setPinMode] = useState<"create" | "unlock">("unlock");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const adminChoiceMaximum = DEFAULT_ADMIN_CHOICE_MAXIMUM;
  const allowedChoiceCounts = availablePatientChoiceCounts(adminChoiceMaximum);
  const [choiceCount, setChoiceCount] = useState(() => normalizePatientChoiceCount(8, adminChoiceMaximum));
  const [textScale, setTextScale] = useState(1);
  const [speechRate, setSpeechRate] = useState(0.82);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>("auto");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [showMissingChoices, setShowMissingChoices] = useState(false);
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
  const [selected, setSelected] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const lastTrackedScreen = useRef("");

  const getMembership = useCallback(async (userId: string) => {
    const { data } = await supabase.from("space_members").select("space_id,profile_id,role,label").eq("profile_id", userId).eq("is_active", true).limit(1).maybeSingle();
    if (!data) return null;
    return data as Member;
  }, []);

  const loadMessages = useCallback(async (activeMember: Member | null = member) => {
    if (!activeMember || demo) return;
    const { data } = await supabase.from("messages").select("id,body_de,body_en,priority,sent_at,sender_profile_id,message_receipts(profile_id,read_at)").eq("space_id", activeMember.space_id).is("archived_at", null).order("sent_at", { ascending: false }).limit(50);
    if (data) setMessages(data as AppMessage[]);
  }, [demo, member]);

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
      .select("speech_enabled,speech_rate,voice_name,choice_count,text_scale")
      .eq("profile_id", member.profile_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setAudioEnabled(data.speech_enabled);
        setSpeechRate(Number(data.speech_rate));
        setChoiceCount(normalizePatientChoiceCount(data.choice_count, adminChoiceMaximum));
        setTextScale(Number(data.text_scale) / 1.3);
        if (data.voice_name === "wortnah:female") setVoicePreference("female");
        else if (data.voice_name === "wortnah:male") setVoicePreference("male");
        else setVoicePreference("auto");
      });
  }, [member, demo]);

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

  const speak = useCallback((text: string, id?: string) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "de" ? "de-DE" : "en-GB";
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    const locale = utterance.lang.toLowerCase();
    const exactVoices = availableVoices.filter((voice) => voice.lang.replace("_", "-").toLowerCase() === locale);
    const femaleNames = /(anna|katja|helena|marlene|petra|vicki|victoria|amelie|seraphina|sophie|female)/i;
    const maleNames = /(markus|martin|conrad|hans|stefan|thomas|daniel|male)/i;
    const preferredPattern = voicePreference === "female" ? femaleNames : voicePreference === "male" ? maleNames : null;
    const selectedVoice = (preferredPattern && exactVoices.find((voice) => preferredPattern.test(voice.name)))
      || exactVoices.find((voice) => voice.default)
      || exactVoices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => setSpeaking(id ?? "message");
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, lang, speechRate, availableVoices, voicePreference]);

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
    if (commStep === "purpose") return purposes;
    if (commStep === "topic") return topicsByPurpose[purpose?.id ?? "tell"];
    if (commStep === "detail") return getDetails(purpose?.id ?? "tell", topic?.id ?? "my_day");
    return [];
  }, [commStep, purpose, topic]);

  useEffect(() => () => window.speechSynthesis?.cancel(), [view, commStep]);

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

  const openHome = () => { resetCommunication(); setView(role === "companion" ? "admin" : "home"); };

  const handleAuth = async () => {
    setError(""); setStatus("");
    if (!email || password.length < 8) { setError(lang === "de" ? "Bitte geben Sie eine E-Mail und ein Passwort mit mindestens 8 Zeichen ein." : "Enter an email and a password of at least 8 characters."); return; }
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: desiredRole === "user" ? "Mein Bereich" : "Begleitung", preferred_language: lang, initial_role: desiredRole } } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setError(result.error.message); return; }
    if (!result.data.session) { setStatus(t.checkEmail); return; }
    setSession(result.data.session);
    const current = await getMembership(result.data.session.user.id);
    if (current) {
      setMember(current); setRole(current.role); setPinMode("create"); setView("pin");
    } else setView("onboarding");
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
    setError("");
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
  };

  const openDemo = (demoRole: Role) => {
    setDemo(true); setRole(demoRole); setDesiredRole(demoRole); setPinMode("unlock"); setError(""); setView("pin");
    setMember({ space_id: "demo", profile_id: demoRole, role: demoRole, label: demoRole === "user" ? t.user : t.companion });
    setMessages([{ id: "demo-message", body_de: "Bitte bring mir etwas zu trinken.", body_en: "Please bring me something to drink.", priority: "important", sent_at: new Date(Date.now() - 8 * 60000).toISOString(), sender_profile_id: "user", message_receipts: [] }]);
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
    if (commStep === "purpose") { setPurpose(choice); setCommStep("topic"); }
    else if (commStep === "topic") { setTopic(choice); setCommStep("detail"); }
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
    await supabase.from("interaction_events").insert({
      space_id: member.space_id,
      profile_id: member.profile_id,
      event_type: "help_requested",
      screen_key: `communicate_${commStep}`,
      choice_count: commStep === "purpose" ? 4 : choiceCount,
      metadata: {
        reason: "missing_option",
        missing_type: missingType,
        purpose_id: purpose?.id ?? null,
        topic_id: topic?.id ?? null,
        selected_choice_id: selected,
        visible_option_ids: currentChoices.slice(0, commStep === "purpose" ? 4 : choiceCount).map((choice) => choice.id),
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
    if (!detail || !purpose || !topic || !member) return;
    setError("");
    if (demo) {
      setMessages((items) => [{ id: crypto.randomUUID(), body_de: detail.de, body_en: detail.en, priority, sent_at: new Date().toISOString(), sender_profile_id: "user", message_receipts: [] }, ...items]);
      setCommStep("success"); return;
    }
    const { data, error: sendError } = await supabase.from("messages").insert({
      space_id: member.space_id, sender_profile_id: member.profile_id, purpose_node_id: purposeIds[purpose.id], topic_node_id: topicIds[topic.id] ?? null,
      content_type: "text", body_de: detail.de, body_en: detail.en, priority,
    }).select("id").single();
    if (sendError || !data) { setError(t.saveError); return; }
    await supabase.from("interaction_events").insert({ space_id: member.space_id, profile_id: member.profile_id, event_type: "message_sent", screen_key: "message_success", choice_count: choiceCount, metadata: { purpose_id: purpose.id, topic_id: topic.id, priority } });
    setCommStep("success");
  };

  const createInvite = async () => {
    setError("");
    if (demo) { setGeneratedInvite("WORT2468"); return; }
    const { data, error: inviteError } = await supabase.rpc("create_user_invite");
    if (inviteError || !data) { setError(inviteError?.message ?? t.saveError); return; }
    setGeneratedInvite(data);
  };

  const markRead = async (message: AppMessage) => {
    if (!member) return;
    if (!demo) {
      const { error: readError } = await supabase.from("message_receipts").upsert({ message_id: message.id, space_id: member.space_id, profile_id: member.profile_id }, { onConflict: "message_id,profile_id" });
      if (readError) { setError(t.saveError); return; }
    }
    setMessages((items) => items.map((item) => item.id === message.id ? { ...item, message_receipts: [{ profile_id: member.profile_id, read_at: new Date().toISOString() }] } : item));
  };

  const savePreference = async (patch: Record<string, unknown>) => {
    if (!member || demo) return;
    await supabase.from("profile_preferences").update({ ...patch, updated_by: member.profile_id }).eq("profile_id", member.profile_id);
  };

  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    setSession(null); setMember(null); setRole(null); setDemo(false); setView("welcome"); setError("");
  };

  const shellHeader = (title?: string, allowBack = false) => (
    <header className="app-header">
      <div className="header-left">{allowBack && <button className="header-button" onClick={openHome}><ArrowLeft /><span>{t.back}</span></button>}<Logo /></div>
      {title && <strong className="header-title">{title}</strong>}
      <div className="header-actions">
        <button className="header-button" onClick={() => { setAudioEnabled((v) => !v); window.speechSynthesis?.cancel(); }}>{audioEnabled ? <Volume2 /> : <VolumeX />}<span>{audioEnabled ? t.audioOn : t.audioOff}</span></button>
        <button className="header-button" onClick={() => setLang((value) => value === "de" ? "en" : "de")}><Languages /><span>{lang === "de" ? "EN" : "DE"}</span></button>
      </div>
    </header>
  );

  if (booting) return <main className="app-shell loading-screen"><Logo /><div className="loading-bar" /></main>;

  if (view === "welcome") return (
    <main className="welcome-page" style={{ "--text-scale": textScale } as React.CSSProperties}>
      <div className="welcome-brand"><Logo /><p>{t.tagline}</p></div>
      <section className="welcome-card">
        <div className="trust-row"><span><ShieldCheck /> {t.secure}</span><span><Sparkles /> {t.install}</span></div>
        <h1>{t.chooseArea}</h1>
        <div className="role-grid">
          <button className="role-card user-role" onClick={() => { setDesiredRole("user"); setView("login"); }}><span className="role-icon"><UserRound /></span><span><strong>{t.user}</strong><small>{t.userHint}</small></span><ChevronRight /></button>
          <button className="role-card companion-role" onClick={() => { setDesiredRole("companion"); setView("login"); }}><span className="role-icon"><ShieldCheck /></span><span><strong>{t.companion}</strong><small>{t.companionHint}</small></span><ChevronRight /></button>
        </div>
        <div className="demo-row"><p>{t.demoNote}</p><button onClick={() => openDemo(desiredRole)}>{t.demo}: {desiredRole === "user" ? t.user : t.companion}</button></div>
      </section>
      <button className="language-float" onClick={() => setLang((value) => value === "de" ? "en" : "de")}><Languages /> {lang === "de" ? "English" : "Deutsch"}</button>
    </main>
  );

  if (view === "login") return (
    <main className="app-shell auth-page">
      <button className="text-action back-action" onClick={() => setView("welcome")}><ArrowLeft /> {t.back}</button>
      <section className="auth-card">
        <Logo /><div className="eyebrow">{desiredRole === "user" ? t.user : t.companion}</div>
        <h1>{t.connect}</h1><p>{t.enrollStrong}</p>
        <div className="segmented"><button className={authMode === "signin" ? "active" : ""} onClick={() => setAuthMode("signin")}>{t.signIn}</button><button className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>{t.signUp}</button></div>
        <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>{t.password}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"} /></label>
        {status && <p className="form-status">{status}</p>}{error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" onClick={handleAuth}>{t.continue}<ChevronRight /></button>
      </section>
    </main>
  );

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

  if (view === "pin") return <main className="app-shell"><PinPad title={pinMode === "create" ? t.setPin : t.enterPin} hint={`${t.pinHint}${demo ? " Demo-PIN: 2468" : ""}`} error={error} onComplete={handlePin} onBack={pinMode === "unlock" ? signOut : () => setView("onboarding")} />{pinMode === "unlock" && !demo && <button className="forgot-pin" onClick={signOut}>{t.forgotPin}</button>}</main>;

  if (view === "home") return (
    <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>
      {shellHeader()}
      <div className="content-wrap home-content">
        <div className="page-intro"><span className="mode-pill">{demo ? t.demoMode : t.liveMode}</span><h1>{t.whatDo}</h1></div>
        <div className="home-actions">
          <button className="home-card communicate-card" onClick={() => { resetCommunication(); setView("communicate"); }}><span className="home-icon"><MessageCircle /></span><span><strong>{t.communicate}</strong><small>{lang === "de" ? "Eine Nachricht zusammenstellen" : "Build a message"}</small></span><ChevronRight /></button>
          <button className="home-card practice-card" onClick={() => { void logInteraction("practice_started", "practice"); setPracticeIndex(0); setView("practice"); }}><span className="home-icon"><BookOpen /></span><span><strong>{t.practice}</strong><small>{lang === "de" ? "Hören und nachsprechen" : "Listen and repeat"}</small></span><ChevronRight /></button>
          <button className="home-card messages-card" onClick={() => setView("messages")}><span className="home-icon"><Bell /></span><span><strong>{t.messages}</strong><small>{messages.length ? `${messages.length} ${lang === "de" ? "Mitteilung(en)" : "message(s)"}` : t.noMessages}</small></span><ChevronRight /></button>
        </div>
        <button className="settings-card" onClick={() => setView("settings")}><Settings2 /><span><strong>{t.settings}</strong><small>{lang === "de" ? "Ton, Anzeige und Auswahl" : "Sound, display and choices"}</small></span><ChevronRight /></button>
      </div>
      <footer className="status-footer"><span className={online ? "online" : "offline"} />{online ? t.online : t.offline}</footer>
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
          {["purpose","topic","detail"].includes(commStep) && <ChoiceGrid choices={currentChoices} lang={lang} selected={selected} speaking={speaking} onChoose={chooseCommunication} count={commStep === "purpose" ? 4 : choiceCount} />}
          {commStep !== "success" && <button className="missing-topic-button" onClick={() => setShowMissingChoices((open) => !open)} aria-expanded={showMissingChoices}><CircleHelp />{t.missingTopic}</button>}
          {showMissingChoices && commStep !== "success" && <section className="missing-choice-panel" aria-label={t.whatMissing}><h2>{t.whatMissing}</h2><div>{missingChoices.map((item) => <button key={item.id} onClick={() => void reportMissing(item.id)}>{item[lang]}</button>)}</div></section>}
          {status && view === "communicate" && <p className="inline-status">{status}</p>}
          {commStep === "review" && detail && <section className="message-review"><div className="quote-mark">“</div><p>{detail[lang]}</p><div className="review-actions"><button onClick={() => speak(detail[lang])}><Volume2 />{t.listen}</button><button onClick={() => setCommStep("practice")}><Mic />{t.practice}</button><button onClick={() => setCommStep("detail")}><RotateCcw />{t.change}</button><button className="primary-button" onClick={() => setCommStep("priority")}><Send />{t.send}</button></div></section>}
          {commStep === "practice" && detail && <section className="practice-panel"><span className="practice-orb"><Headphones /></span><h2>{t.practiceTitle}</h2><p>{t.practiceHint}</p><blockquote>{detail[lang]}</blockquote><div className="practice-controls"><button onClick={() => speak(detail[lang])}><RotateCcw />{t.repeat}</button><button className="primary-button" onClick={() => setCommStep("priority")}><Check />{t.done}</button></div></section>}
          {commStep === "priority" && detail && <section className="priority-panel"><div className="compact-message">{detail[lang]}</div><div className="priority-grid">{(["normal","important","very_important"] as Priority[]).map((item) => <button key={item} className={`priority-card ${item} ${priority === item ? "selected" : ""}`} onClick={() => setPriority(item)}><span />{item === "normal" ? t.normal : item === "important" ? t.important : t.veryImportant}{priority === item && <Check />}</button>)}</div>{error && <p className="form-error">{error}</p>}<button className="send-final" onClick={sendMessage}><Send />{t.sendNow}</button></section>}
          {commStep === "success" && <section className="success-panel"><span className="success-check"><Check /></span><h1>{t.sent}</h1><p>{t.sentHint}</p><button className="primary-button" onClick={openHome}>{t.home}</button></section>}
        </div>
        {commStep !== "success" && <nav className="bottom-nav"><button onClick={communicationBack}><ArrowLeft />{t.back}</button><button onClick={() => { void logInteraction("choice_repeat", `communicate_${commStep}`); const text = commStep === "review" || commStep === "practice" || commStep === "priority" ? detail?.[lang] : selected ? currentChoices.find((item) => item.id === selected)?.[lang] : currentChoices[0]?.[lang]; if (text) speak(text); }}><RotateCcw />{t.repeat}</button><button onClick={() => { void logInteraction("audio_toggle", `communicate_${commStep}`); setAudioEnabled((v) => !v); }}>{audioEnabled ? <Volume2 /> : <VolumeX />}{audioEnabled ? t.audioOn : t.audioOff}</button></nav>}
      </main>
    );
  }

  if (view === "practice") {
    const practiceItems = lang === "de" ? ["Bitte", "Danke", "Ich brauche eine Pause.", "Bitte bring mir etwas zu trinken."] : ["Please", "Thank you", "I need a break.", "Please bring me something to drink."];
    const item = practiceItems[practiceIndex % practiceItems.length];
    return <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.practice, true)}<div className="content-wrap standalone-practice"><span className="practice-orb"><Headphones /></span><div className="page-heading"><h1>{t.practiceTitle}</h1><p>{t.practiceHint}</p></div><blockquote>{item}</blockquote><button className="listen-large" onClick={() => speak(item)}><Volume2 />{t.listen}</button><div className="practice-controls"><button onClick={() => speak(item)}><RotateCcw />{t.repeat}</button><button className="primary-button" onClick={() => { void logInteraction("practice_completed", "practice"); setPracticeIndex((value) => value + 1); }}>{t.next}<ChevronRight /></button></div><button className="text-action" onClick={openHome}>{t.done}</button></div></main>;
  }

  if (view === "messages") return (
    <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.messages, true)}<div className="content-wrap"><div className="page-heading"><h1>{t.messages}</h1><p>{lang === "de" ? "Ihre gesendeten Nachrichten und der Lesestatus." : "Your sent messages and read status."}</p></div><div className="message-list">{messages.length === 0 ? <div className="empty-state"><Bell /><h2>{t.noMessages}</h2></div> : messages.map((message) => <article className={`message-item ${message.priority}`} key={message.id}><div className="message-meta"><span>{message.priority === "normal" ? t.normal : message.priority === "important" ? t.important : t.veryImportant}</span><time>{new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(message.sent_at))}</time></div><p>{lang === "de" ? message.body_de : message.body_en}</p><div className="delivery-state">{message.message_receipts?.length ? <><Check />{t.read}</> : <><Send />{t.delivery}</>}</div></article>)}</div></div></main>
  );

  if (view === "settings") {
    const previewLabels = lang === "de"
      ? ["Essen", "Trinken", "Familie", "Termine", "Gefühle", "Hilfe", "Aktivitäten", "Weitere Themen"]
      : ["Food", "Drinks", "Family", "Appointments", "Feelings", "Help", "Activities", "More topics"];
    return (
      <main className="app-shell main-app" style={{ "--text-scale": textScale } as React.CSSProperties}>{shellHeader(t.settings, true)}<div className="content-wrap settings-content">
        <div className="settings-section"><h2><Volume2 />{lang === "de" ? "Sprache und Ton" : "Language and sound"}</h2>
          <button className="setting-row" onClick={() => { setAudioEnabled((v) => !v); savePreference({ speech_enabled: !audioEnabled }); }}><span><strong>{audioEnabled ? t.audioOn : t.audioOff}</strong><small>{lang === "de" ? "Eine Auswahl wird beim Antippen klar vorgelesen" : "A choice is read clearly when tapped"}</small></span><span className={`switch ${audioEnabled ? "on" : ""}`}><i /></span></button>
          <div className="setting-block"><strong>{t.voice}</strong><small>{lang === "de" ? "Wortnah verwendet nur verfügbares Standarddeutsch (de-DE)." : "Wortnah uses available Standard German voices (de-DE) only."}</small><div className="option-row">{(["auto","female","male"] as VoicePreference[]).map((voice) => <button key={voice} className={voicePreference === voice ? "active" : ""} onClick={() => { setVoicePreference(voice); savePreference({ voice_name: voice === "auto" ? null : `wortnah:${voice}`, voice_locale: "de-DE" }); }}>{voice === "auto" ? t.voiceAuto : voice === "female" ? t.voiceFemale : t.voiceMale}</button>)}</div><button className="test-voice-button" onClick={() => speak(lang === "de" ? "Guten Tag. Ich spreche klar und in Ruhe." : "Hello. I speak clearly and calmly.")}><Volume2 />{t.voiceTest}</button></div>
          <div className="setting-block"><strong>{t.speechSpeed}</strong><div className="option-row">{[[0.72,t.slow],[0.82,t.clear],[0.92,t.normalSpeed]].map(([rate,label]) => <button key={String(rate)} className={speechRate === rate ? "active" : ""} onClick={() => { setSpeechRate(rate as number); savePreference({ speech_rate: rate }); }}>{label}</button>)}</div></div>
          <button className="setting-row" onClick={() => setLang((value) => value === "de" ? "en" : "de")}><span><strong>{lang === "de" ? "Deutsch" : "English"}</strong><small>{lang === "de" ? "Sprache der ganzen App" : "Language for the whole app"}</small></span><Languages /></button>
        </div>
        <div className="settings-section"><h2><Settings2 />{t.appearance}</h2>
          <div className="setting-block"><strong>{t.choices}</strong><small>{lang === "de" ? `Mein Bereich kann bis zum festgelegten Maximum von ${adminChoiceMaximum} wählen.` : `My Space can choose up to the configured maximum of ${adminChoiceMaximum}.`}</small><div className="option-row">{allowedChoiceCounts.map((count) => <button key={count} className={choiceCount === count ? "active" : ""} onClick={() => { setChoiceCount(count); savePreference({ choice_count: count }); }}>{count}</button>)}</div><div className={`choice-preview preview-${choiceCount}`}>{previewLabels.slice(0, choiceCount).map((label) => <span key={label}>{label}</span>)}</div></div>
          <div className="setting-block"><strong>{t.textSize}</strong><div className="option-row">{[[1,t.standard],[1.12,t.large],[1.24,t.larger]].map(([scale,label]) => <button key={String(scale)} className={textScale === scale ? "active" : ""} onClick={() => { setTextScale(scale as number); savePreference({ text_scale: Number(scale) * 1.3 }); }}>{label}</button>)}</div></div>
        </div>
        <div className="settings-section"><h2><LockKeyhole />{t.account}</h2><button className="setting-row destructive-row" onClick={signOut}><span><strong>{t.signOut}</strong><small>{lang === "de" ? "Dieses Gerät sicher trennen" : "Disconnect this device securely"}</small></span><LogOut /></button></div>
      </div></main>
    );
  }

  const importantCount = messages.filter((message) => message.priority !== "normal").length;
  const costText = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(usageSummary.aiCostCents / 100);
  const maxDailyActivity = Math.max(1, ...usageSummary.dailyActivity.map((day) => day.count));
  return (
    <main className="app-shell main-app admin-app">
      {shellHeader(t.companion)}
      <div className="admin-layout">
        <aside className="admin-sidebar"><nav><button className="active"><BarChart3 />{t.dashboard}</button><button onClick={() => setView("messages")}><Bell />{t.messages}</button><button onClick={() => setView("settings")}><Settings2 />{t.settings}</button></nav><button className="text-action" onClick={signOut}><LogOut />{t.signOut}</button></aside>
        <div className="admin-main">
          <div className="admin-title"><div><span className="mode-pill">{demo ? t.demoMode : t.liveMode}</span><h1>{t.dashboard}</h1><p>{lang === "de" ? "Ein ruhiger Überblick über Kommunikation und Nutzung." : "A calm overview of communication and usage."}</p></div><div className="connection-pill"><span className={online ? "online" : "offline"} />{online ? t.online : t.offline}</div></div>
          <section className="kpi-grid"><article><span className="kpi-icon blue"><MessageCircle /></span><div><strong>{usageSummary.messagesThisWeek}</strong><small>{t.messagesWeek}</small></div></article><article><span className="kpi-icon green"><Check /></span><div><strong>{usageSummary.activeDays}</strong><small>{t.activeDays}</small></div></article><article><span className="kpi-icon amber"><Bell /></span><div><strong>{importantCount}</strong><small>{t.kpiImportant}</small></div></article><article><span className="kpi-icon blue"><CircleHelp /></span><div><strong>{usageSummary.missingThisWeek}</strong><small>{t.missingReports}</small></div></article></section>
          <div className="admin-columns"><section className="admin-panel"><div className="panel-heading"><div><h2>{t.messages}</h2><p>{lang === "de" ? "Neueste zuerst" : "Newest first"}</p></div><Bell /></div><div className="compact-list">{messages.length === 0 ? <p className="quiet-empty">{t.noMessages}</p> : messages.slice(0,5).map((message) => <article key={message.id}><div><span className={`priority-dot ${message.priority}`} /> <time>{new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.sent_at))}</time></div><p>{lang === "de" ? message.body_de : message.body_en}</p>{message.message_receipts?.length ? <span className="read-label"><Check />{t.read}</span> : <button className="read-button" onClick={() => markRead(message)}>{t.markRead}</button>}</article>)}</div></section><section className="admin-panel invite-panel"><div className="panel-heading"><div><h2>{t.inviteUser}</h2><p>{lang === "de" ? "Einmalige sichere Einrichtung" : "One-time secure setup"}</p></div><UserRound /></div>{generatedInvite ? <div className="invite-code"><strong>{generatedInvite}</strong><p>{t.codeValid}</p></div> : <button className="primary-button" onClick={createInvite}>{t.createCode}<ChevronRight /></button>}{error && <p className="form-error">{error}</p>}<div className="recommendation-block"><h3><Sparkles />{t.recommendations}</h3><p>{t.noRecommendations}</p></div></section></div>
          <section className="usage-panels"><article className="admin-panel cost-controller-panel"><div className="panel-heading"><div><h2>{t.aiController}</h2><p>{usageSummary.budget.ai_enabled ? t.aiUsage : t.aiManualOnly}</p></div><ShieldCheck /></div><div className="controller-status"><strong>{usageSummary.budget.ai_enabled ? t.aiUsage : t.aiLocked}</strong><span>{usageSummary.budget.ai_enabled ? t.aiManualOnly : lang === "de" ? "Normale Wortnah-Nutzung verwendet keine KI-Tokens." : "Normal Wortnah use does not use AI tokens."}</span></div><dl><div><dt>{lang === "de" ? "Anfragen" : "Requests"}</dt><dd>{usageSummary.aiRequests} / {usageSummary.budget.monthly_request_limit}</dd></div><div><dt>{lang === "de" ? "Tokens" : "Tokens"}</dt><dd>{usageSummary.aiInputTokens + usageSummary.aiOutputTokens}</dd></div><div><dt>{lang === "de" ? "Kosten" : "Cost"}</dt><dd>{costText} / {new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(usageSummary.budget.monthly_cost_limit_cents / 100)}</dd></div></dl></article><article className="admin-panel usage-trend-panel"><div className="panel-heading"><div><h2>{t.usageOverTime}</h2><p>{usageSummary.startedAt ? (lang === "de" ? "Seit der ersten echten Nutzung" : "Since first real use") : (lang === "de" ? "Beginnt mit der ersten echten Nutzung" : "Begins with first real use")}</p></div><BarChart3 /></div>{usageSummary.dailyActivity.length ? <div className="usage-bars">{usageSummary.dailyActivity.map((day) => <div key={day.label}><i style={{ height: `${Math.max(6, (day.count / maxDailyActivity) * 100)}%` }} /><span>{day.label}</span><b>{day.count}</b></div>)}</div> : <p className="quiet-empty">{lang === "de" ? "Noch keine reale Nutzung erfasst." : "No real usage recorded yet."}</p>}</article></section>
        </div>
      </div>
    </main>
  );
}
