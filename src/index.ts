#!/usr/bin/env node

import { program } from "commander";
import { add } from "./commands/add";

program
    .name("volt-vue")
    .description("Add PrimeVue Volt components to your project")
    .version("0.0.0-alpha.4", "-v, --version", "Output the current version")
    .option("--verbose", "Show detailed error messages");

program
    .command("add")
    .description("Add the specified Volt component to your project")
    .option("--no-src-dir", "Install to root directory instead of src directory")
    .option("--outdir <directory>", "Specify output directory (overrides src-dir option)")
    .option("--no-deps", "Don't automatically install dependencies")
    .argument("<components...>", 'Component name(s) or "all" for all components')
    .action(async (components, options) => {
        await add(components, options);
    });

// Handle unknown commands
program.on("command:*", () => {
    console.error("❌ Invalid command: %s", program.args.join(" "));
    console.log("");
    console.log("Available commands:");
    console.log("  add <components>                    - Add component(s) to your project");
    console.log("");
    console.log("Examples:");
    console.log("  volt-vue add button                 - Add button component to src/volt");
    console.log("  volt-vue add panel                  - Add panel with only required dependencies");
    console.log("  volt-vue add panel button           - Add panel and full button component");
    console.log("  volt-vue add --no-src-dir button    - Add button component to root/volt");
    console.log("  volt-vue add --outdir lib button    - Add button component to lib/volt");
    console.log("  volt-vue add --no-deps panel        - Add panel without dependencies");
    console.log("  volt-vue add all                    - Add all components");
    process.exit(1);
});

// Show help if no arguments provided
if (process.argv.length === 2) {
    program.outputHelp();
    process.exit(1);
}

program.parse(process.argv);

// Handle unhandled promise rejections
process.on("unhandledRejection", function (err: Error) {
    const debug = program.opts().verbose;

    if (debug && err instanceof Error) {
        console.error(err.stack);
    }

    console.error("❌ Unhandled error occurred");
    process.exit(1);
});
