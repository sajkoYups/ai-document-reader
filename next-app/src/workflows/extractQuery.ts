import type { ExtractType } from "./types";

export function queryForExtract(type: ExtractType, customQuery?: string): string {
  switch (type) {
    case "dates":
      return "date deadline effective term renewal period schedule";
    case "entities":
      return "party person organization company name role";
    case "amounts":
      return "price cost fee payment amount total currency";
    case "obligations":
      return "shall must obligation duty provide deliver";
    case "requirements":
      return "shall must requirement mandatory specification criteria";
    case "contacts":
      return "email phone address contact name";
    case "custom":
      return customQuery?.trim() || "key information";
    default:
      return "key points parties dates amounts obligations requirements contact";
  }
}
