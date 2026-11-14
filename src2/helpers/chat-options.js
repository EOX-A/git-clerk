// Local prototype options from the design reference; no model/API integration.
export const CHAT_AUTOMATIONS = [
  {
    label: "Add product",
    description: "Create a product entry and link it from the catalog",
    template:
      "Add a product called [ product name ] under the [ parent project ] project, described as [ short description ].",
  },
  {
    label: "Add project",
    description: "Create a project entry",
    template:
      "Add a project called [ project name ], led by [ lead institution ], described as [ short description ].",
  },
  {
    label: "Update dates",
    description: "Correct temporal extents",
    template:
      "Change the dates of [ product or project ] to [ start date ] – [ end date ].",
  },
];

export const CHAT_MODELS = [
  { heading: "Default" },
  { label: "Auto", description: "Chooses a model for each step" },
  { heading: "Google" },
  { label: "Gemini 4 Argon", description: "Most capable Gemini model" },
  { label: "Gemini 3.8 Flash", description: "Fast, low cost" },
  { label: "Gemini 3.5 Flash-Lite", description: "Lightest and cheapest" },
  { heading: "ESA Φ-lab" },
  {
    label: "EVE-Instruct",
    description: "Earth Virtual Expert, tuned for Earth observation",
  },
];
