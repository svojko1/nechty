const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

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
  console.log("Setting up shadcn/ui with predefined options...");

  try {
    // Create necessary directories
    const directories = ["src/components/ui", "src/lib"];
    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });

    // Create utils.js file
    const utilsContent = `import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}`;
    fs.writeFileSync("src/lib/utils.js", utilsContent);
    console.log("Created src/lib/utils.js");

    // Update tailwind.config.js
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}`;
    fs.writeFileSync("tailwind.config.js", tailwindConfig);
    console.log("Updated tailwind.config.js");

    // Update src/index.css
    const indexCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;
    fs.writeFileSync("src/index.css", indexCssContent);
    console.log("Updated src/index.css");

    // Create components.json
    const componentsJson = {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "default",
      rsc: false,
      tsx: false,
      tailwind: {
        config: "tailwind.config.js",
        css: "src/index.css",
        baseColor: "slate",
        cssVariables: true,
      },
      aliases: {
        components: "./src/components",
        utils: "./src/lib/utils",
      },
    };
    fs.writeFileSync(
      "components.json",
      JSON.stringify(componentsJson, null, 2)
    );
    console.log("Created components.json");

    // Install necessary dependencies
    console.log("Installing shadcn/ui dependencies...");
    execSync(
      "npm install tailwindcss-animate class-variance-authority clsx tailwind-merge",
      { stdio: "inherit" }
    );

    // Add default components
    const defaultComponents = ["button", "card", "input", "label"];
    defaultComponents.forEach((component) => {
      try {
        execSync(`npx shadcn-ui@latest add ${component} --yes`, {
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
    console.error(`Failed to set up shadcn/ui. Error: ${error.message}`);
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
