export const CHECK_STATUS = {
  success: {
    tooltip: "Validation Successful",
    icon: "mdi-check-bold",
    color: "green",
    status: "success",
    success: true,
  },
  failed: {
    tooltip: "Validation Failed",
    icon: "mdi-alert-outline",
    color: "red-accent-4",
    status: "failure",
    success: false,
  },
};

export const OSC_REQUIRED_PROPERTIES_PATHS = {
  "osc:themes": "themes",
  "osc:missions": "eo-missions",
  "osc:project": "projects",
  "osc:variables": "variables",
};
