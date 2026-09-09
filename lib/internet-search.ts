export type InternetSearchLevel = 1 | 2 | 3 | 4;

export type InternetSearchNode = {
  id: string;
  option_key: string;
  parent_key: string | null;
  search_level: InternetSearchLevel;
  label_de: string;
  label_en: string;
  query_de: string | null;
  query_en: string | null;
  is_published: boolean;
  sort_order: number;
};

const branch = (key: string, parent: string | null, level: InternetSearchLevel, order: number, de: string, en: string): InternetSearchNode => ({
  id: `fallback-${key}`,
  option_key: key,
  parent_key: parent,
  search_level: level,
  label_de: de,
  label_en: en,
  query_de: null,
  query_en: null,
  is_published: true,
  sort_order: order,
});

const leaf = (key: string, parent: string, level: InternetSearchLevel, order: number, de: string, en: string, queryDe: string, queryEn: string): InternetSearchNode => ({
  id: `fallback-${key}`,
  option_key: key,
  parent_key: parent,
  search_level: level,
  label_de: de,
  label_en: en,
  query_de: queryDe,
  query_en: queryEn,
  is_published: true,
  sort_order: order,
});

// German leaf phrases match the reviewed MP3 intake manifest exactly.
export const fallbackInternetSearchNodes: InternetSearchNode[] = [
  branch("information", null, 1, 10, "Informationen", "Information"),
  branch("places", null, 1, 20, "Orte und Gesundheit", "Places and health"),
  branch("travel", null, 1, 30, "Wege und Fahrpläne", "Routes and timetables"),
  branch("media", null, 1, 40, "Musik und Videos", "Music and videos"),
  branch("food-language", null, 1, 50, "Kochen und Sprache", "Cooking and language"),
  branch("search-help", null, 1, 60, "Ergebnisse und Hilfe", "Results and help"),

  branch("weather", "information", 2, 10, "Wetter", "Weather"),
  branch("news", "information", 2, 20, "Nachrichten", "News"),
  branch("television", "information", 2, 30, "Fernsehprogramm", "TV guide"),
  branch("weather-time", "weather", 3, 10, "Zeit auswählen", "Choose a time"),
  branch("weather-detail", "weather", 3, 20, "Temperatur oder Regen", "Temperature or rain"),
  leaf("weather-today", "weather-time", 4, 10, "Heute", "Today", "Wie wird das Wetter heute?", "What will the weather be like today?"),
  leaf("weather-tomorrow", "weather-time", 4, 20, "Morgen", "Tomorrow", "Wie wird das Wetter morgen?", "What will the weather be like tomorrow?"),
  leaf("weather-weekend", "weather-time", 4, 30, "Wochenende", "Weekend", "Wie wird das Wetter am Wochenende?", "What will the weather be like this weekend?"),
  leaf("temperature-today", "weather-detail", 4, 10, "Wie warm wird es?", "How warm will it be?", "Wie warm wird es heute?", "How warm will it be today?"),
  leaf("rain-today", "weather-detail", 4, 20, "Regnet es?", "Will it rain?", "Regnet es heute?", "Will it rain today?"),
  leaf("news-today", "news", 3, 10, "Nachrichten heute", "Today's news", "Was sind die Nachrichten von heute?", "What is today's news?"),
  leaf("news-germany", "news", 3, 20, "Neues aus Deutschland", "News from Germany", "Was gibt es Neues aus Deutschland?", "What's new in Germany?"),
  leaf("sports-news", "news", 3, 30, "Sportnachrichten", "Sports news", "Was gibt es Neues im Sport?", "What's new in sports?"),
  leaf("tv-today", "television", 3, 10, "Heute im Fernsehen", "On TV today", "Was läuft heute im Fernsehen?", "What's on TV today?"),
  leaf("show-find", "television", 3, 20, "Meine Sendung", "My programme", "Wann läuft meine Sendung?", "When is my programme on?"),

  branch("business", "places", 2, 10, "Geschäft und Kontakt", "Business and contact"),
  branch("health-place", "places", 2, 20, "Arzt und Apotheke", "Doctor and pharmacy"),
  leaf("opening-hours", "business", 3, 10, "Öffnungszeiten", "Opening hours", "Wann hat dieses Geschäft geöffnet?", "When is this business open?"),
  leaf("address", "business", 3, 20, "Adresse", "Address", "Wie lautet die Adresse?", "What is the address?"),
  leaf("phone-number", "business", 3, 30, "Telefonnummer", "Phone number", "Wie lautet die Telefonnummer?", "What is the phone number?"),
  leaf("doctor-find", "health-place", 3, 10, "Arztpraxis finden", "Find a doctor's office", "Ich möchte eine Arztpraxis finden.", "I want to find a doctor's office."),
  leaf("pharmacy-find", "health-place", 3, 20, "Nächste Apotheke", "Nearest pharmacy", "Wo ist die nächste Apotheke?", "Where is the nearest pharmacy?"),
  leaf("pharmacy-emergency", "health-place", 3, 30, "Apotheken-Notdienst", "Emergency pharmacy", "Welche Apotheke hat Notdienst?", "Which pharmacy is on emergency duty?"),

  branch("route", "travel", 2, 10, "Weg finden", "Find a route"),
  branch("public-transport", "travel", 2, 20, "Bus und Bahn", "Bus and train"),
  leaf("directions", "route", 3, 10, "Wie komme ich dorthin?", "How do I get there?", "Wie komme ich dorthin?", "How do I get there?"),
  leaf("bus", "public-transport", 3, 10, "Nächster Bus", "Next bus", "Wann fährt der nächste Bus?", "When is the next bus?"),
  leaf("train", "public-transport", 3, 20, "Nächster Zug", "Next train", "Wann fährt der nächste Zug?", "When is the next train?"),
  leaf("timetable", "public-transport", 3, 30, "Fahrplan", "Timetable", "Ich möchte den Fahrplan sehen.", "I want to see the timetable."),

  branch("watch", "media", 2, 10, "Film und Serie", "Films and series"),
  branch("listen", "media", 2, 20, "Musik und Radio", "Music and radio"),
  leaf("film", "watch", 3, 10, "Film finden", "Find a film", "Ich möchte einen Film finden.", "I want to find a film."),
  leaf("series", "watch", 3, 20, "Serie finden", "Find a series", "Ich möchte eine Serie finden.", "I want to find a series."),
  leaf("video", "watch", 3, 30, "Video ansehen", "Watch a video", "Ich möchte ein Video ansehen.", "I want to watch a video."),
  leaf("music", "listen", 3, 10, "Musik hören", "Listen to music", "Ich möchte Musik hören.", "I want to listen to music."),
  leaf("radio", "listen", 3, 20, "Radio hören", "Listen to radio", "Ich möchte Radio hören.", "I want to listen to the radio."),

  branch("cooking", "food-language", 2, 10, "Kochen", "Cooking"),
  branch("language", "food-language", 2, 20, "Wörter verstehen", "Understand words"),
  leaf("recipe", "cooking", 3, 10, "Rezept finden", "Find a recipe", "Ich möchte ein Rezept finden.", "I want to find a recipe."),
  leaf("dish", "cooking", 3, 20, "Gericht kochen", "Cook a dish", "Wie koche ich dieses Gericht?", "How do I cook this dish?"),
  leaf("translate", "language", 3, 10, "Wort übersetzen", "Translate a word", "Bitte übersetze dieses Wort.", "Please translate this word."),
  leaf("meaning", "language", 3, 20, "Bedeutung eines Wortes", "Meaning of a word", "Was bedeutet dieses Wort?", "What does this word mean?"),
  leaf("images", "language", 3, 30, "Bilder dazu", "Related pictures", "Ich möchte Bilder dazu sehen.", "I want to see pictures of it."),

  branch("display-results", "search-help", 2, 10, "Ergebnisse anzeigen", "Show results"),
  branch("change-search", "search-help", 2, 20, "Suche ändern", "Change search"),
  leaf("large-text", "display-results", 3, 10, "Große Schrift", "Large text", "Bitte zeige die Ergebnisse in großer Schrift.", "Please show the results in large text."),
  leaf("read-results", "display-results", 3, 20, "Ergebnisse vorlesen", "Read results aloud", "Bitte lies mir die Ergebnisse vor.", "Please read the results to me."),
  leaf("continue-reading", "display-results", 3, 30, "Weiterlesen", "Continue reading", "Bitte lies weiter.", "Please continue reading."),
  leaf("explain-simple", "display-results", 3, 40, "Einfach erklären", "Explain simply", "Bitte erkläre das einfach.", "Please explain that simply."),
  leaf("search-again", "change-search", 3, 10, "Noch einmal suchen", "Search again", "Bitte suche noch einmal.", "Please search again."),
  leaf("other-results", "change-search", 3, 20, "Andere Ergebnisse", "Other results", "Bitte zeige andere Ergebnisse.", "Please show other results."),
];

export function childrenOf(nodes: InternetSearchNode[], parentKey: string | null) {
  return nodes
    .filter((node) => node.is_published && node.parent_key === parentKey)
    .sort((a, b) => a.sort_order - b.sort_order || a.label_de.localeCompare(b.label_de, "de"));
}
