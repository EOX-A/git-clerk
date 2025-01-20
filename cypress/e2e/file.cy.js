import { E2E_URL } from "../enums";
import ghConfig from "../fixtures/gh-config.json";
import { GITHUB_HOST_REGEX } from "../enums";
import content from "../fixtures/content:get.json";

describe("File related tests", () => {
  before(() => {
    cy.visit(E2E_URL + "/123/cHJvZHVjdHMvZm9vL2NvbGxlY3Rpb24uanNvbg==");
  });

  let isProductContentChanged = false;
  let isNarrativeContentChanged = false;
  let isNormalContentChanged = false;

  beforeEach(() => {
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
        ),
      },
      (req) => {
        let tempContent = content;
        if (isProductContentChanged) {
          tempContent.content =
            "ewogICJ0eXBlIjogIkNvbGxlY3Rpb24iLAogICJpZCI6ICJhZGRpdC1lYXJ0aHF1YWtlLXRzdW5hbWktdG9vbC1jb3N0byIsCiAgInN0YWNfdmVyc2lvbiI6ICIxLjAuMCIsCiAgImRlc2NyaXB0aW9uIjogIlRoaXMgaXMgYSB0ZXN0IGRlc2NyaXB0aW9uIiwKICAibGlua3MiOiB7CiAgICAiMCI6IHsKICAgICAgIjAiOiB7CiAgICAgICAgIjAiOiB7CiAgICAgICAgICAiMCI6IHsKICAgICAgICAgICAgIjAiOiB7CiAgICAgICAgICAgICAgIjAiOiB7CiAgICAgICAgICAgICAgICAicmVsIjogInJvb3QiLAogICAgICAgICAgICAgICAgImhyZWYiOiAiLi4vLi4vY2F0YWxvZy5qc29uIiwKICAgICAgICAgICAgICAgICJ0eXBlIjogImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAgICAgICAgICAgInRpdGxlIjogIk9wZW4gU2NpZW5jZSBDYXRhbG9nIgogICAgICAgICAgICAgIH0sCiAgICAgICAgICAgICAgIjEiOiB7CiAgICAgICAgICAgICAgICAicmVsIjogInZpYSIsCiAgICAgICAgICAgICAgICAiaHJlZiI6ICJodHRwczovL3d3dy5tZHBpLmNvbS8yMDcyLTQyOTIvMTEvMTYvMTg5NC9odG0jYXBwMS1yZW1vdGVzZW5zaW5nLTExLTAxODk0IiwKICAgICAgICAgICAgICAgICJ0aXRsZSI6ICJBY2Nlc3MiCiAgICAgICAgICAgICAgfSwKICAgICAgICAgICAgICAiMiI6IHsKICAgICAgICAgICAgICAgICJyZWwiOiAiY2l0ZS1hcyIsCiAgICAgICAgICAgICAgICAiaHJlZiI6ICJodHRwczovL2RvaS5vcmcvMTAuMzM5MC9yczExMTYxODk0IiwKICAgICAgICAgICAgICAgICJ0aXRsZSI6ICJET0kiCiAgICAgICAgICAgICAgfSwKICAgICAgICAgICAgICAiMyI6IHsKICAgICAgICAgICAgICAgICJyZWwiOiAicGFyZW50IiwKICAgICAgICAgICAgICAgICJocmVmIjogIi4uL2NhdGFsb2cuanNvbiIsCiAgICAgICAgICAgICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIiwKICAgICAgICAgICAgICAgICJ0aXRsZSI6ICJQcm9kdWN0cyIKICAgICAgICAgICAgICB9LAogICAgICAgICAgICAgICI0IjogewogICAgICAgICAgICAgICAgInJlbCI6ICJyZWxhdGVkIiwKICAgICAgICAgICAgICAgICJocmVmIjogIi4uLy4uL3Byb2plY3RzL2NvbnRyaWJ1dGlvbi1vZi1zd2FybS1kYXRhLXRvLXRoZS1wcm9tcHQtZGV0ZWN0aW9uLW9mLXRzdW5hbWlzLWFuZC1vdGhlci1uYXR1cmFsLWhhemFyZHMtY29zdG8vY29sbGVjdGlvbi5qc29uIiwKICAgICAgICAgICAgICAgICJ0eXBlIjogImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAgICAgICAgICAgInRpdGxlIjogIlByb2plY3Q6IENPU1RPIgogICAgICAgICAgICAgIH0sCiAgICAgICAgICAgICAgIjUiOiB7CiAgICAgICAgICAgICAgICAicmVsIjogInJlbGF0ZWQiLAogICAgICAgICAgICAgICAgImhyZWYiOiAiLi4vLi4vdGhlbWVzL21hZ25ldG9zcGhlcmUtaW9ub3NwaGVyZS9jYXRhbG9nLmpzb24iLAogICAgICAgICAgICAgICAgInR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIsCiAgICAgICAgICAgICAgICAidGl0bGUiOiAiVGhlbWU6IE1hZ25ldG9zcGhlcmVfSW9ub3NwaGVyZSIKICAgICAgICAgICAgICB9LAogICAgICAgICAgICAgICI2IjogewogICAgICAgICAgICAgICAgInJlbCI6ICJyZWxhdGVkIiwKICAgICAgICAgICAgICAgICJocmVmIjogIi4uLy4uL3ZhcmlhYmxlcy9pb25vc3BoZXJlLW1hZ25ldG9zcGhlcmUtZHluYW1pY3MvY2F0YWxvZy5qc29uIiwKICAgICAgICAgICAgICAgICJ0eXBlIjogImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAgICAgICAgICAgInRpdGxlIjogIlZhcmlhYmxlOiBJb25vc3BoZXJlL01hZ25ldG9zcGhlcmUgRHluYW1pY3MiCiAgICAgICAgICAgICAgfSwKICAgICAgICAgICAgICAiNyI6IHsKICAgICAgICAgICAgICAgICJyZWwiOiAicmVsYXRlZCIsCiAgICAgICAgICAgICAgICAiaHJlZiI6ICIuLi8uLi9lby1taXNzaW9ucy9zd2FybS9jYXRhbG9nLmpzb24iLAogICAgICAgICAgICAgICAgInR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIsCiAgICAgICAgICAgICAgICAidGl0bGUiOiAiRU8gTWlzc2lvbjogU1dBUk0iCiAgICAgICAgICAgICAgfSwKICAgICAgICAgICAgICAiOCI6IHsKICAgICAgICAgICAgICAgICJyZWwiOiAic2VsZiIsCiAgICAgICAgICAgICAgICAiaHJlZiI6ICJodHRwczovL2VzYS1lYXJ0aGNvZGUuZ2l0aHViLmlvL29wZW4tc2NpZW5jZS1jYXRhbG9nLW1ldGFkYXRhL3Byb2R1Y3RzL2FkZGl0LWVhcnRocXVha2UtdHN1bmFtaS10b29sLWNvc3RvL2NvbGxlY3Rpb24uanNvbiIsCiAgICAgICAgICAgICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIgogICAgICAgICAgICAgIH0sCiAgICAgICAgICAgICAgInJlbCI6ICIiLAogICAgICAgICAgICAgICJocmVmIjogIiIsCiAgICAgICAgICAgICAgInR5cGUiOiAiIiwKICAgICAgICAgICAgICAidGl0bGUiOiAiIgogICAgICAgICAgICB9LAogICAgICAgICAgICAicmVsIjogIiIsCiAgICAgICAgICAgICJocmVmIjogIiIsCiAgICAgICAgICAgICJ0eXBlIjogIiIsCiAgICAgICAgICAgICJ0aXRsZSI6ICIiCiAgICAgICAgICB9LAogICAgICAgICAgInJlbCI6ICIiLAogICAgICAgICAgImhyZWYiOiAiIiwKICAgICAgICAgICJ0eXBlIjogIiIsCiAgICAgICAgICAidGl0bGUiOiAiIgogICAgICAgIH0sCiAgICAgICAgIjEiOiB7CiAgICAgICAgICAiaHJlZiI6ICIuLi8uLi9lby1taXNzaW9ucy9hbG9zLTQvY2F0YWxvZy5qc29uIiwKICAgICAgICAgICJ0aXRsZSI6ICJBTE9TLTQiLAogICAgICAgICAgInR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIsCiAgICAgICAgICAicmVsIjogInJlbGF0ZWQiCiAgICAgICAgfSwKICAgICAgICAiMiI6IHsKICAgICAgICAgICJyZWwiOiAicmVsYXRlZCIsCiAgICAgICAgICAiaHJlZiI6ICIuLi8uLi9wcm9qZWN0cy80ZC1ncmVlbmxhbmQvY29sbGVjdGlvbi5qc29uIiwKICAgICAgICAgICJ0eXBlIjogImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAgICAgInRpdGxlIjogIjRELUdyZWVubGFuZCIKICAgICAgICB9LAogICAgICAgICJyZWwiOiAiIiwKICAgICAgICAiaHJlZiI6ICIiLAogICAgICAgICJ0eXBlIjogIiIsCiAgICAgICAgInRpdGxlIjogIiIKICAgICAgfSwKICAgICAgInJlbCI6ICIiLAogICAgICAiaHJlZiI6ICIiLAogICAgICAidHlwZSI6ICIiLAogICAgICAidGl0bGUiOiAiIgogICAgfQogIH0sCiAgInN0YWNfZXh0ZW5zaW9ucyI6IHsKICAgICIwIjogIntcIjBcIjpcIntcXFwiMFxcXCI6XFxcIntcXFxcXFxcIjBcXFxcXFxcIjpcXFxcXFxcIntcXFxcXFxcXFxcXFxcXFwiMFxcXFxcXFxcXFxcXFxcXCI6XFxcXFxcXFxcXFxcXFxcIntcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjBcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjpcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcImh0dHBzOi8vc3RhYy1leHRlbnNpb25zLmdpdGh1Yi5pby9vc2MvdjEuMC4wLXJjLjMvc2NoZW1hLmpzb25cXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIixcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjFcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjpcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcImh0dHBzOi8vc3RhYy1leHRlbnNpb25zLmdpdGh1Yi5pby9zY2llbnRpZmljL3YxLjAuMC9zY2hlbWEuanNvblxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiLFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiMlxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiOlxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiaHR0cHM6Ly9zdGFjLWV4dGVuc2lvbnMuZ2l0aHViLmlvL2NmL3YwLjIuMC9zY2hlbWEuanNvblxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwifVxcXFxcXFxcXFxcXFxcXCJ9XFxcXFxcXCJ9XFxcIn1cIn0iCiAgfSwKICAib3NjOnByb2plY3QiOiAiNGQtZ3JlZW5sYW5kIiwKICAib3NjOnN0YXR1cyI6ICJvbmdvaW5nIiwKICAib3NjOnJlZ2lvbiI6ICJKYXBhbiIsCiAgIm9zYzp0eXBlIjogInByb2R1Y3QiLAogICJjcmVhdGVkIjogIjIwMTktMDgtMTNUMDA6MDA6MDBaIiwKICAic3RhcnRfZGF0ZXRpbWUiOiAiMjAxMS0wMS0wMVQwMDowMDowMFoiLAogICJlbmRfZGF0ZXRpbWUiOiAiMjAxMS0xMi0zMVQyMzo1OTo1OVoiLAogICJzY2k6ZG9pIjogIjEwLjMzOTAvcnMxMTE2MTg5NCIsCiAgImNmOnBhcmFtZXRlciI6IHsKICAgICIwIjogewogICAgICAiMCI6IHsKICAgICAgICAiMCI6IHsKICAgICAgICAgICIwIjogewogICAgICAgICAgICAiMCI6IHsKICAgICAgICAgICAgICAiMCI6IHsKICAgICAgICAgICAgICAgICJuYW1lIjogImVhcnRocXVha2VfdHN1bmFtaV90b29sIgogICAgICAgICAgICAgIH0sCiAgICAgICAgICAgICAgIm5hbWUiOiAiIgogICAgICAgICAgICB9LAogICAgICAgICAgICAibmFtZSI6ICIiCiAgICAgICAgICB9LAogICAgICAgICAgIm5hbWUiOiAiIgogICAgICAgIH0sCiAgICAgICAgIm5hbWUiOiAiIgogICAgICB9LAogICAgICAibmFtZSI6ICIiCiAgICB9CiAgfSwKICAib3NjOnRoZW1lcyI6IHsKICAgICIwIjogIntcIjBcIjpcIntcXFwiMFxcXCI6XFxcInRoZW1lcy9tYWduZXRvc3BoZXJlLWlvbm9zcGhlcmVcXFwiLFxcXCIxXFxcIjpcXFwidGhlbWVzL29jZWFuc1xcXCIsXFxcIjJcXFwiOlxcXCJ0aGVtZXMvc29saWQtZWFydGhcXFwifVwifSIKICB9LAogICJvc2M6dmFyaWFibGVzIjogewogICAgIjAiOiAie1wiMFwiOlwie1xcXCIwXFxcIjpcXFwidmFyaWFibGVzLzEzLWNoNC1kZWx0YVxcXCIsXFxcIjFcXFwiOlxcXCJ2YXJpYWJsZXMvMTMtY28tZGVsdGFcXFwiLFxcXCIyXFxcIjpcXFwidmFyaWFibGVzLzEzLWNvMi1kZWx0YVxcXCIsXFxcIjNcXFwiOlxcXCJ2YXJpYWJsZXMvMTQtY2g0LWRlbHRhXFxcIixcXFwiNFxcXCI6XFxcInZhcmlhYmxlcy8xNC1jby1udW1iZXItY29uY2VudHJhdGlvblxcXCIsXFxcIjVcXFwiOlxcXCJ2YXJpYWJsZXMvMTQtY28yLWRlbHRhXFxcIixcXFwiNlxcXCI6XFxcInZhcmlhYmxlcy9hYmxhdGlvbi16b25lcy1hY2N1bXVsYXRpb24tem9uZXNcXFwifVwifSIKICB9LAogICJvc2M6bWlzc2lvbnMiOiB7CiAgICAiMCI6ICJ7XCIwXCI6XCJ7XFxcIjBcXFwiOlxcXCJhbG9zLTRcXFwifVwifSIKICB9LAogICJ1cGRhdGVkIjogIjIwMjQtMDktMTJUMjA6MzI6MDYuMjA5MTA4WiIsCiAgInRpdGxlIjogIkZvbyBCYXIiLAogICJleHRlbnQiOiB7CiAgICAic3BhdGlhbCI6IHsKICAgICAgImJib3giOiB7CiAgICAgICAgIjAiOiB7CiAgICAgICAgICAiMCI6ICJ7XCIwXCI6e1wiMFwiOlwie1xcXCIwXFxcIjp7XFxcIjBcXFwiOlxcXCJ7XFxcXFxcXCIwXFxcXFxcXCI6e1xcXFxcXFwiMFxcXFxcXFwiOjEyMi43MTQxNzUzNyxcXFxcXFxcIjFcXFxcXFxcIjoyMC4yMTQ1ODEwMixcXFxcXFxcIjJcXFxcXFxcIjoxNTQuMjA1NTQwOTgsXFxcXFxcXCIzXFxcXFxcXCI6NDUuNzExMjA0NTR9fVxcXCIsXFxcIjFcXFwiOlxcXCJcXFwiLFxcXCIyXFxcIjpcXFwiXFxcIixcXFwiM1xcXCI6XFxcIlxcXCJ9fVwiLFwiMVwiOlwiXCIsXCIyXCI6XCJcIixcIjNcIjpcIlwifX0iLAogICAgICAgICAgIjEiOiAiIiwKICAgICAgICAgICIyIjogIiIsCiAgICAgICAgICAiMyI6ICIiCiAgICAgICAgfQogICAgICB9CiAgICB9LAogICAgInRlbXBvcmFsIjogewogICAgICAiaW50ZXJ2YWwiOiB7CiAgICAgICAgIjAiOiB7CiAgICAgICAgICAiMCI6ICJ7XCIwXCI6e1wiMFwiOlwie1xcXCIwXFxcIjp7XFxcIjBcXFwiOlxcXCJ7XFxcXFxcXCIwXFxcXFxcXCI6e1xcXFxcXFwiMFxcXFxcXFwiOlxcXFxcXFwie1xcXFxcXFxcXFxcXFxcXCIwXFxcXFxcXFxcXFxcXFxcIjp7XFxcXFxcXFxcXFxcXFxcIjBcXFxcXFxcXFxcXFxcXFwiOlxcXFxcXFxcXFxcXFxcXCJ7XFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCIwXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCI6e1xcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiMFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiOlxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFwiMjAxMS0wMS0wMVQwMDowMDowMFpcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIixcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjFcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjpcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIjIwMTEtMTItMzFUMjM6NTk6NTlaXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCJ9fVxcXFxcXFxcXFxcXFxcXCIsXFxcXFxcXFxcXFxcXFxcIjFcXFxcXFxcXFxcXFxcXFwiOlxcXFxcXFxcXFxcXFxcXCJcXFxcXFxcXFxcXFxcXFwifX1cXFxcXFxcIixcXFxcXFxcIjFcXFxcXFxcIjpcXFxcXFxcIlxcXFxcXFwifX1cXFwiLFxcXCIxXFxcIjpcXFwiXFxcIn19XCIsXCIxXCI6XCJcIn19IiwKICAgICAgICAgICIxIjogIiIKICAgICAgICB9CiAgICAgIH0KICAgIH0KICB9LAogICJsaWNlbnNlIjogInByb3ByaWV0YXJ5IiwKICAia2V5d29yZHMiOiB7CiAgICAiMCI6ICJ7XCIwXCI6XCJ7XFxcIjBcXFwiOlxcXCJ7XFxcXFxcXCIwXFxcXFxcXCI6XFxcXFxcXCJ7XFxcXFxcXFxcXFxcXFxcIjBcXFxcXFxcXFxcXFxcXFwiOlxcXFxcXFxcXFxcXFxcXCJ7XFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCIwXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCI6XFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCJTdW4tRWFydGggSW50ZXJhY3Rpb25zXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCIsXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCIxXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCI6XFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXCJJb25vc3BoZXJlL01hZ25ldG9zcGhlcmUgRHluYW1pY3NcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcIn1cXFxcXFxcXFxcXFxcXFwifVxcXFxcXFwifVxcXCJ9XCJ9IgogIH0KfQ";
        }
        if (isNarrativeContentChanged) {
          tempContent.content = "IyBTdG9yeQ==";
        }
        if (isNormalContentChanged) {
          tempContent.content = "Y29uc29sZS5sb2coIkhlbGxvIFdvcmxkIik7";
        }
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  it("Load OSC related files", () => {
    cy.wait("@getContent");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.title"] input')
          .clear()
          .type("Foo Bar");
        cy.get('div[data-schemapath="root.title"] input').blur();
        isProductContentChanged = true;
      });
    cy.get("eox-jsonform").then(($jsonform) => {
      let value = $jsonform[0].editor.getValue();
      value.description = "This is a test description";
      $jsonform[0].editor.setValue(value);
    });
    cy.get(".navbar .v-btn").click();
    cy.wait("@getContent");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.title"] input').should(
          "have.value",
          "Foo Bar",
        );
        cy.get(
          'div[data-schemapath="root.description"] .CodeMirror-line span',
        ).should("have.text", "This is a test description");
      });
  });

  it("Load a narrative file", () => {
    isNarrativeContentChanged = true;
    cy.visit(E2E_URL + "/123/bmFycmF0aXZlcy9zdG9yeTEubWQ=");
    cy.get("iframe#previewFrame").should("be.visible");
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .find("h1")
      .should("have.text", "Story");

    cy.get("eox-jsonform").then(($jsonform) => {
      const editor = $jsonform[0].editor;
      editor.setValue({
        Story: "## Hello World",
      });
    });

    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .find("h2")
      .should("have.text", "Hello World");
  });

  it("Load a normal file", () => {
    isNormalContentChanged = true;
    cy.visit(E2E_URL + "/123/Y29kZS5qcw==");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel textarea").should(
          "have.value",
          `console.log("Hello World");`,
        );
      });

    const file = `const foo = "bar";console.log(foo);`;
    cy.get("eox-jsonform").then(($jsonform) => {
      const editor = $jsonform[0].editor;
      editor.setValue({
        file,
      });
    });

    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel textarea").should("have.value", file);
      });
  });
});
