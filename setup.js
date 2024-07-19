const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const packages = {
  'framer-motion': 'Framer Motion',
  'lucide-react': 'Lucide React',
  'react-router-dom': 'React Router',
  '@radix-ui/react-icons': 'Radix Icons',
};

console.log("React + Tailwind Boilerplate Setup");

const installPackage = (packageName) => {
  console.log();
  execSync(
up to date, audited 1549 packages in 1s

262 packages are looking for funding
  run `npm fund` for details

8 vulnerabilities (2 moderate, 6 high)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details., { stdio: 'inherit' });
};

const askForPackage = (packageName) => {
  return new Promise((resolve) => {
    rl.question(, (answer) => {
      if (answer.toLowerCase() === 'y') {
        installPackage(packageName);
      }
      resolve();
    });
  });
};

const setupShadcn = () => {
  return new Promise((resolve) => {
    rl.question('Do you want to set up shadcn/ui? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('Setting up shadcn/ui...');
        
        // Ensure jsconfig.json exists
        if (!fs.existsSync('jsconfig.json')) {
          console.log('Creating jsconfig.json...');
          fs.writeFileSync('jsconfig.json', JSON.stringify({
            compilerOptions: {
              baseUrl: ".",
              paths: {
                "@/*": ["./src/*"]
              }
            }
          }, null, 2));
        }

        execSync('npx shadcn-ui@latest init', { stdio: 'inherit' });
        rl.question('Enter shadcn/ui components to add (comma-separated, or press enter for none): ', (components) => {
          if (components.trim() !== "") {
            components.split(',').forEach(component => {
              execSync(, { stdio: 'inherit' });
            });
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

const main = async () => {
  for (const packageName of Object.keys(packages)) {
    await askForPackage(packageName);
  }
  await setupShadcn();
  console.log('Setup complete!');
  rl.close();
};

main();
