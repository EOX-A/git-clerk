import { spawn } from "child_process";
import cypress from "cypress";

const serve = spawn("npm", ["run", "test:serve"], { shell: true });

let port;

const isOpen = process.argv.includes("--open");

serve.stdout.on("data", (data) => {
  const output = data.toString();

  // Adjust this regex to match the port log format in your app
  const portMatch = output.match(/http:\/\/localhost:(\d+)/i);
  if (portMatch) {
    port = portMatch[1];
    // Start Cypress after detecting the port
    cypress[isOpen ? "open" : "run"]({
      config: {
        baseUrl: `http://localhost:${port}`,
      },
      browser: "chrome",
    })
      .then(() => {
        serve.kill(); // Kill the serve process after tests complete
      })
      .catch((err) => {
        console.error("Error running Cypress:", err);
        serve.kill();
        process.exit(1);
      });
  }
});

serve.stderr.on("data", (data) => {
  console.error(data.toString());
});

serve.on("close", (code) => {
  if (code !== 0) {
    console.error(`test:serve exited with code ${code}`);
  }
});
