import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const defaultDecks = [
  {
    title: "Barkada Deck",
    description: "Usapang malalim, totoo, at walang plastikan para sa barkada.",
    category: "friends",
    visibility: "private",
    cards: [
      { text: "Ano yung isang bagay na matagal mo nang gustong aminin sa akin pero takot kang ma-judge?", type: "secret" },
      { text: "Kung pwede tayong tumakas sa mga problema natin kahit isang araw lang, saan tayo pupunta at anong gagawin natin?", type: "question" },
      { text: "Ano yung pinakapaborito mong memorya natin na madalas mong binabalikan pag nalulungkot ka?", type: "question" },
      { text: "Ano yung isang ugali ko na sana hindi magbago kahit tumanda na tayo?", type: "appreciation" },
      { text: "Ano yung pinakamabigat mong dinadala ngayon na hindi mo kinukwento sa barkada?", type: "comfort" },
      { text: "Kung may isang bagay kang gustong baguhin sa dynamics ng friendship natin, ano yun at bakit?", type: "question" },
      { text: "Ano yung pangarap mong binitiwan mo na kasi naramdaman mong parang hindi makatotohanan?", type: "secret" },
      { text: "Saan mo ako nakikitang pinakamagaling, na minsan feeling ko wala akong kwenta doon?", type: "appreciation" },
      { text: "Sa tingin mo ba, in 10 years, magkakaibigan pa rin tayo? Paano kaya tayo mag-iiba?", type: "future" },
      { text: "Ano yung isang bagay na gusto mong ma-achieve natin nang magkasama bago tayo tuluyang maging busy sa kanya-kanyang buhay?", type: "mission" },
    ],
  },
  {
    title: "Mag-Partner Deck",
    description: "Mga tanong na susubok at magpapalalim sa pundasyon ninyong dalawa.",
    category: "couples",
    visibility: "private",
    cards: [
      { text: "Kailan mo na-realize na gusto mo akong makasama, hindi lang sa masaya, kundi pati sa mahirap na panahon?", type: "question" },
      { text: "Anong ginagawa ko na nagpaparamdam sayong safe ka at tanggap kita nang buong-buo?", type: "appreciation" },
      { text: "Kung may isang salita na magdedescribe sa naging pinakamahirap na phase ng relationship natin, ano yun?", type: "question" },
      { text: "Anong toxic trait natin bilang magkarelasyon ang kailangan na nating ayusin bago pa lumala?", type: "future" },
      { text: "Ano yung pinakagusto mong part sa pagkatao ko na madalas hindi nakikita ng ibang tao?", type: "appreciation" },
      { text: "Kung pwede mong balikan yung isang araw na muntik na tayong sumuko, anong sasabihin mo sa sarili mo?", type: "question" },
      { text: "Ano yung pinakakinatatakutan mong mangyari sa ating dalawa sa future?", type: "future" },
      { text: "May bagay ba tungkol sa sarili mo o sa past mo na nahihirapan ka pa ring tanggapin, na gusto mong intindihin ko?", type: "secret" },
      { text: "Paano kita mas masuportahan sa mga araw na pakiramdam mo ang bigat-bigat ng buhay?", type: "mission" },
      { text: "Kailan mo naramdaman na magkalayo tayo kahit magkasama naman tayo? Paano natin iiwasan yun?", type: "question" },
    ],
  },
  {
    title: "Pamilya Deck",
    description: "Mga usapang bihirang buksan pero kailangang harapin bilang isang pamilya.",
    category: "family",
    visibility: "private",
    cards: [
      { text: "Ano yung memory natin bilang pamilya na hanggang ngayon, nagbibigay sa'yo ng peace of mind?", type: "question" },
      { text: "Anong sakripisyo ng isang miyembro ng pamilyang ito ang hindi masyadong napapasalamatan?", type: "appreciation" },
      { text: "Ano yung isang toxic cycle o ugali sa pamilya natin na gusto mong tayo na ang tumapos?", type: "future" },
      { text: "Ano yung tanong na matagal mo nang gustong itanong sa amin, pero natatakot ka sa magiging sagot?", type: "secret" },
      { text: "Anong pinakamahalagang aral ang natutunan mo sa pamilyang 'to na bitbit mo kahit saan ka magpunta?", type: "question" },
      { text: "Ano yung bagay na gusto mong ipagpasalamat sa pamilyang ito, na hindi mo madalas nasasabi?", type: "appreciation" },
      { text: "Nung mga panahong hirap na hirap ang pamilya natin, ano yung nagpakapit sa'yo para hindi sumuko?", type: "question" },
      { text: "Kung ito na ang huling araw na kumpleto tayo, paano mo gagamitin yung natitirang oras natin?", type: "mission" },
      { text: "Anong topic ang lagi nating iniiwasan pag-usapan sa bahay na 'to na kailangan na nating harapin?", type: "comfort" },
      { text: "Kapag may kanya-kanya na tayong buhay o pamilya, paano mo gustong manatili tayong konektado?", type: "future" },
    ],
  }
];

export const seedDefaultDecks = async (userId: string, displayName: string) => {
  for (const deck of defaultDecks) {
    const { cards, ...deckData } = deck;

    const deckRef = await addDoc(collection(db, "decks"), {
      ...deckData,
      owner: userId,
      ownerName: displayName,
      likes: 0,
      isDefault: true,
      createdAt: Date.now(),
    });

    for (const card of cards) {
      await addDoc(collection(db, "decks", deckRef.id, "cards"), {
        ...card,
        createdAt: Date.now(),
      });
    }
  }
};