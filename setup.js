const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const options = {
  "framer-motion": "Framer Motion",
  "react-router-dom": "React Router",
  "@radix-ui/react-icons": "Radix Icons",
};

const defaultOptions = ["lucide-react", "shadcn-ui"];

console.log("React + Tailwind Boilerplate Setup");

const installPackage = (packageName) => {
  const displayName = options[packageName] || packageName;
  console.log(`Installing ${displayName}...`);
  try {
    execSync(`npm install ${packageName}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to install ${displayName}. Error: ${error.message}`);
  }
};

const setupShadcn = () => {
  console.log("Setting up shadcn/ui with default options...");

  if (!fs.existsSync("jsconfig.json")) {
    console.log("Creating jsconfig.json...");
    fs.writeFileSync(
      "jsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "@/*": ["./src/*"],
            },
          },
        },
        null,
        2
      )
    );
  }

  try {
    execSync("npx shadcn-ui@latest init -y", { stdio: "inherit" });

    const defaultComponents = ["button", "card", "input", "label"];
    defaultComponents.forEach((component) => {
      try {
        execSync(`npx shadcn-ui@latest add ${component} -y`, {
          stdio: "inherit",
        });
      } catch (error) {
        console.error(
          `Failed to add component ${component}. Error: ${error.message}`
        );
      }
    });

    console.log("shadcn/ui setup complete with default components.");
  } catch (error) {
    console.error(`Failed to initialize shadcn/ui. Error: ${error.message}`);
  }
};

const multiSelect = () => {
  return new Promise((resolve) => {
    console.log(
      "\nSelect additional options to install (separate multiple choices with commas):"
    );
    console.log("Default options (will be installed if you just hit enter):");
    console.log("- Lucide React");
    console.log("- shadcn/ui");
    console.log("\nAdditional options:");
    Object.entries(options).forEach(([key, value], index) => {
      console.log(`${index + 1}. ${value}`);
    });

    rl.question(
      "Enter your choices (e.g., 1,3) or just hit enter for defaults: ",
      (answer) => {
        if (answer.trim() === "") {
          resolve(defaultOptions);
        } else {
          const selections = answer
            .split(",")
            .map((num) => parseInt(num.trim()) - 1);
          const selectedOptions = Object.keys(options).filter((_, index) =>
            selections.includes(index)
          );
          resolve([...defaultOptions, ...selectedOptions]);
        }
      }
    );
  });
};

const main = async () => {
  try {
    const selectedOptions = await multiSelect();

    for (const option of selectedOptions) {
      if (option === "shadcn-ui") {
        await setupShadcn();
      } else {
        await installPackage(option);
      }
    }

    console.log("Setup complete!");
  } catch (error) {
    console.error("An error occurred during setup:", error);
  } finally {
    rl.close();
  }
};

main();
