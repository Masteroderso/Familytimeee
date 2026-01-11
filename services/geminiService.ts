
import { GoogleGenAI, Type } from "@google/genai";
import { WordPair, GameType } from "../types";
import { FALLBACK_WORDS } from "../constants";

export const generateWordPair = async (
  categoryChoice: string = "Zufall", 
  gameType: GameType = GameType.IMPOSTOR,
  excludeWords: string[] = []
): Promise<WordPair> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const entropy = Math.random().toString(36).substring(7);
    const creativeVibes = ["wesentlich", "konzeptionell", "abstrakt", "funktional"];
    const randomVibe = creativeVibes[Math.floor(Math.random() * creativeVibes.length)];

    const exclusionList = excludeWords.length > 0 ? `VERMEIDE DIESE WÖRTER: ${excludeWords.join(", ")}` : "";

    let systemPrompt = "";
    let userPrompt = "";

    if (gameType === GameType.FRAGEN_MIX) {
      systemPrompt = "Du bist ein extrem kreativer Spiele-Autor. Erstelle zwei unterschiedliche, aber perfekt vergleichbare Fragen.";
      userPrompt = `Generiere zwei Fragen (Deutsch), die ähnliche Antworten provozieren.
      KATEGORIE: ${categoryChoice}. VIBE: ${randomVibe}.
      ENTROPIE-TOKEN: ${entropy}.
      ${exclusionList}
      ANFORDERUNGEN: 'secretWord' ist Frage A, 'hintWord' ist Frage B.`;
    } else {
      const categoryPrompt = categoryChoice === "Zufall" 
        ? "Wähle eine spannende, bekannte Kategorie." 
        : `Nutze die Kategorie '${categoryChoice}'.`;

      systemPrompt = `Du bist ein brillanter Spiele-Designer. Generiere ein deutsches Wortpaar für ein Social-Deduction-Spiel.
      
      ZIEL: Ein konkretes 'secretWord' (für die Bürger) und ein cleveres 'hintWord' (für den Impostor).
      
      STRIKTE REGELN FÜR DAS HILFSWORT (hintWord):
      1. ABSOLUTES VERBOT VON SYNONYMEN ODER NAHEN VERWANDTEN: Wenn 'secretWord' ein Apfel ist, darf 'hintWord' NIEMALS Birne, Frucht, Obst oder Banane sein!
      2. KATEGORIEN-SPRUNG: Das Hilfswort muss aus einer völlig anderen begrifflichen Ebene kommen (Eigenschaft, Aktion, Material, Geschichte).
      3. KONZEPTIONELLER ANSATZ: Wähle Wörter, die eine Eigenschaft, eine Funktion oder einen kulturellen Kontext beschreiben.
      
      ${exclusionList}

      BEISPIELE FÜR EXZELLENTE PAARE:
      - Secret: 'Apfel' -> Hint: 'Sünde' (Kultureller Kontext/Adam & Eva)
      - Secret: 'Apfel' -> Hint: 'Physik' (Newton/Gravitation)
      - Secret: 'Spiegel' -> Hint: 'Reflexion' (Optik)
      - Secret: 'Kaffee' -> Hint: 'Röstung' (Prozess)
      - Secret: 'Auto' -> Hint: 'Benzin' (Antrieb)
      - Secret: 'Sonne' -> Hint: 'Licht' (Naturphänomen)
      - Secret: 'Geld' -> Hint: 'Bank' (Ort)
      - Secret: 'Bett' -> Hint: 'Träumen' (Aktivität)

      SCHLECHTE PAARE (VERBOTEN!):
      - 'Apfel' -> 'Birne' (NEIN! Zu ähnlich)
      - 'Katze' -> 'Hund' (NEIN! Zu ähnlich)
      - 'Auto' -> 'Zug' (NEIN! Zu ähnlich)

      Das Hilfswort soll dem Impostor erlauben, vage über das Thema zu reden ("Es ist gesund", "Es hat mit Geschichte zu tun"), ohne das Wort selbst zu erraten.`;

      userPrompt = `${categoryPrompt} 
      VIBE: ${randomVibe}.
      SEED: ${entropy}.

      ANFORDERUNGEN:
      - 'secretWord': Das konkrete Hauptwort.
      - 'hintWord': Die kluge, distanzierte Assoziation.
      - Antworte NUR mit JSON.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        temperature: 1.0,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            secretWord: { type: Type.STRING, description: "Das konkrete Wort" },
            hintWord: { type: Type.STRING, description: "Die kluge Assoziation" },
            category: { type: Type.STRING, description: "Die Unterkategorie" }
          },
          required: ["secretWord", "hintWord", "category"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      return {
        secretWord: data.secretWord.trim(),
        hintWord: data.hintWord ? data.hintWord.trim() : "",
        category: data.category.trim()
      };
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("AI Generation failed, using fallback:", error);
    const availableFallbacks = FALLBACK_WORDS.filter(w => !excludeWords.includes(w.secretWord));
    const pool = availableFallbacks.length > 0 ? availableFallbacks : FALLBACK_WORDS;
    const pair = pool[Math.floor(Math.random() * pool.length)];
    return {
      secretWord: pair.secretWord,
      hintWord: pair.hintWord,
      category: pair.category
    };
  }
};
