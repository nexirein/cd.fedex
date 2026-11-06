import { extractEmail, normalizeAwb, validAwb, SENDABLE_DEFAULT } from "@/lib/rules";

export type RawRow = Record<string, any>;
export type Validated = {
  awb: string; company_name: string; consignee_name: string; contact_email: string; email_source: string;
  end_result: string; broker: string; clearance_type: string; location: string; freight_value: string; currency: string;
  verdict: "ACCEPTED" | "REJECTED"; preflight_result: "PASS" | "BLOCKED" | "SKIPPED" | "REJECTED"; preflight_reason: string;
  standard_remarks: string; consignee_email_id_raw: string; raw_json: any;
};

const alias = (row: RawRow, keys: string[]) => {
  for (const k of keys) for (const rk of Object.keys(row)) if (rk.trim().toLowerCase() === k.toLowerCase()) return row[rk];
  return "";
};
const s = (v: any) => String(v ?? "").trim();

export function validateRows(rows: RawRow[], sendable = SENDABLE_DEFAULT): Validated[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    const awb = normalizeAwb(alias(r, ["AWB Numbers", "AWB No", "AWB", "awb"]));
    const company = s(alias(r, ["SQL Account Customer Name", "Consignee Name", "Consignee", "Company"])) || s(alias(r, ["Consignee Name"]));
    const consignee = s(alias(r, ["Consignee Name", "Consignee"])) || company;
    const standard = s(alias(r, ["Standard Remarks", "Remarks"]));
    const rawEmailField = s(alias(r, ["ConsigneeEmailID", "Consignee Email ID"]));
    const contact_email = extractEmail(standard); // rule: Standard Remarks only
    let end_result = s(alias(r, ["End Result", "EndResult", "ClearanceType"])).toUpperCase().replace(/\s+/g, " ").trim();
    const fedexBrokerRaw = s(alias(r, ["FedEx Broker", "FedExBroker", "FedEx Broker Name", "Broker"])).toUpperCase().trim();
    let broker = "";
    if (fedexBrokerRaw && !["0", "-", "NA", "N/A", "NULL", "NONE"].includes(fedexBrokerRaw)) {
      if (fedexBrokerRaw.includes("JEENA") || fedexBrokerRaw.includes("JINA")) broker = "JEENA";
      else if (fedexBrokerRaw.includes("SUNIMPEX") || fedexBrokerRaw.includes("SUNI")) broker = "SUNIMPEX";
      else broker = fedexBrokerRaw;
    }
    // For FEBRK cases, derive specific broker end result from FedEx Broker column when provided
    if (end_result === "FEBRK" && (broker === "JEENA" || broker === "SUNIMPEX")) {
      end_result = `FEBRK-${broker}`;
    } else if ((end_result === "FEBRK-JEENA" || end_result === "FEBRK_JEENA") && !broker) {
      broker = "JEENA"; end_result = "FEBRK-JEENA";
    } else if ((end_result === "FEBRK-SUNIMPEX" || end_result === "FEBRK_SUNIMPEX") && !broker) {
      broker = "SUNIMPEX"; end_result = "FEBRK-SUNIMPEX";
    } else if (end_result.startsWith("FEBRK-") && !broker) {
      // keep as-is; broker validation below will block if unnamed
      const maybe = end_result.replace("FEBRK-", "").trim();
      if (maybe === "JEENA" || maybe === "SUNIMPEX") broker = maybe;
    }
    const location = s(alias(r, ["Loc", "Location"])).toUpperCase();
    const freight_value = s(alias(r, ["Freight", "InvoiceValue", "Value"]));
    const currency = s(alias(r, ["Currency"])) || "INR";

    const reasons: string[] = [];
    let verdict: Validated["verdict"] = "ACCEPTED";
    let preflight_result: Validated["preflight_result"] = "PASS";

    if (!awb || !validAwb(awb)) { verdict = "REJECTED"; preflight_result = "REJECTED"; reasons.push("AWB missing or not 11–12 digits."); }
    else if (seen.has(awb)) { verdict = "REJECTED"; preflight_result = "REJECTED"; reasons.push(`Duplicate AWB in file (${awb}).`); }
    else seen.add(awb);
    if (!company) { verdict = "REJECTED"; preflight_result = "REJECTED"; reasons.push("Consignee/company name missing."); }
    if (!end_result) { verdict = "REJECTED"; preflight_result = "REJECTED"; reasons.push("End Result missing."); }

    if (preflight_result !== "REJECTED") {
      const isSendable = sendable.includes(end_result);
      if (!isSendable) {
        preflight_result = "SKIPPED";
        if (end_result === "HOLD") reasons.push("On hold. Do not pre-alert.");
        else if (end_result === "CALLING") reasons.push("Marked Calling. Call must clear this first.");
        else if (end_result === "FEBRK") reasons.push("Bare FEBRK. Name broker (JEENA/SUNIMPEX) before sending.");
        else reasons.push(`End Result ${end_result} is not sendable.`);
      } else {
        if (!contact_email) { preflight_result = "BLOCKED"; reasons.push("No valid email found in Standard Remarks."); }
        if (end_result.startsWith("FEBRK") && !(broker === "JEENA" || broker === "SUNIMPEX" || broker)) {
          preflight_result = "BLOCKED"; reasons.push("Broker must be named for FEBRK (use FedEx Broker: JEENA or SUNIMPEX).");
        } else if (end_result.startsWith("FEBRK") && !(broker === "JEENA" || broker === "SUNIMPEX")) {
          preflight_result = "BLOCKED"; reasons.push("FEBRK broker must be JEENA or SUNIMPEX (from FedEx Broker column).");
        }
      }
    }

    const brokerOut = broker || (end_result === "NFBRK" ? "OWN" : (end_result.startsWith("FEBRK-") ? end_result.replace("FEBRK-", "") : ""));
    return {
      awb, company_name: company, consignee_name: consignee, contact_email, email_source: contact_email ? "STANDARD_REMARKS" : "NONE",
      end_result, broker: brokerOut, clearance_type: end_result.startsWith("FEBRK") ? "FEBRK" : end_result,
      location, freight_value, currency, verdict, preflight_result,
      preflight_reason: reasons.join(" ") || "All checks passed.",
      standard_remarks: standard, consignee_email_id_raw: rawEmailField, raw_json: r,
    };
  });
}
