import { execSync } from "child_process";
import { program } from "commander";
import fs from "fs-extra";
import os from "os";
import path from "path";

const tempDir = path.join(os.tmpdir(), "primevue-volt-temp");
const REPO_URL = "https://github.com/primefaces/primevue.git";

interface CommandOptions {
    srcDir: boolean;
    outdir?: string;
    deps: boolean;
}

export async function add(components: string[], options: CommandOptions) {
    const verbose = program.opts().verbose;
    const logVerbose = (message: string) => verbose && console.log(message);

    logVerbose("🔍 Verbose mode enabled. Showing detailed information.");
    logVerbose(`📌 Components to add: ${components.join(", ")}`);
    logVerbose(`📌 Options: ${JSON.stringify(options)}`);
    logVerbose(`📌 Temporary directory: ${tempDir}`);
    logVerbose(`📌 Auto-install dependencies: ${options.deps ? "Yes" : "No"}`);

    try {
        fs.removeSync(tempDir);
        fs.ensureDirSync(tempDir);

        execSync(`git clone --depth 1 ${REPO_URL} ${tempDir}`, { stdio: "ignore" });

        const baseDir = options.outdir
            ? path.join(process.cwd(), options.outdir)
            : options.srcDir
            ? path.join(process.cwd(), "src")
            : process.cwd();

        logVerbose(`📌 Target base directory: ${baseDir}`);

        const voltDir = path.join(baseDir, "volt");
        const voltSourceDir = path.join(tempDir, "apps", "volt", "volt");

        if (components.includes("all")) {
            if (!fs.existsSync(voltSourceDir)) {
                console.error("❌ Volt components directory not found!");
                return;
            }

            fs.ensureDirSync(voltDir);
            fs.copySync(voltSourceDir, voltDir);
            console.log(`✅ All Volt components successfully added.`);
            fs.removeSync(tempDir);
            return;
        }

        const voltUtilsDir = path.join(voltSourceDir, "utils");
        const targetUtilsDir = path.join(voltDir, "utils");

        if (fs.existsSync(voltUtilsDir)) {
            fs.ensureDirSync(voltDir);
            fs.copySync(voltUtilsDir, targetUtilsDir);
        } else {
            console.warn(`⚠️ Utils folder not found in the repository.`);
        }

        let successCount = 0;
        let failCount = 0;
        const processedComponents = new Set<string>();
        const componentsToProcess = [...components];
        const dependencyMap = new Map<string, Set<string>>();

        const copyFullComponent = (component: string): boolean => {
            if (processedComponents.has(component)) return true;

            const voltComponentDir = path.join(voltSourceDir, component);
            if (!fs.existsSync(voltComponentDir)) {
                console.error(`❌ Component ${component} not found!`);
                return false;
            }

            const targetComponentDir = path.join(voltDir, component);
            fs.ensureDirSync(path.dirname(targetComponentDir));
            fs.copySync(voltComponentDir, targetComponentDir);

            processedComponents.add(component);
            logVerbose(`📌 Copied full component: ${component}`);

            return true;
        };

        const analyzeImports = (component: string): void => {
            if (!options.deps) {
                logVerbose(`📌 Skipping dependency analysis for ${component} (--no-deps option used)`);
                return;
            }

            const indexPath = path.join(voltSourceDir, component, "index.vue");
            if (!fs.existsSync(indexPath)) return;

            const content = fs.readFileSync(indexPath, "utf8");

            const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]\.\.\/([^'"\/]+)(?:\/[^'"]+)?['"]/g;
            let match;

            const dependencies = new Set<string>();

            while ((match = importRegex.exec(content)) !== null) {
                const dependencyComponent = match[1];

                if (dependencyComponent === "utils") continue;

                dependencies.add(dependencyComponent);

                if (components.includes(dependencyComponent)) continue;

                if (
                    !processedComponents.has(dependencyComponent) &&
                    !componentsToProcess.includes(dependencyComponent)
                ) {
                    logVerbose(`📌 Found dependency in ${component}: ${dependencyComponent}`);
                    componentsToProcess.push(dependencyComponent);
                }
            }

            if (dependencies.size > 0) {
                dependencyMap.set(component, dependencies);
            }
        };

        while (componentsToProcess.length > 0) {
            const component = componentsToProcess.shift()!;

            if (copyFullComponent(component)) {
                if (components.includes(component)) {
                    successCount++;
                }
            } else if (components.includes(component)) {
                failCount++;
            }

            analyzeImports(component);
        }

        const dependencyCount = Array.from(processedComponents).filter((comp) => !components.includes(comp)).length;

        if (successCount > 0 && failCount === 0) {
            console.log(`✅ ${successCount} component(s) successfully added.`);

            if (options.deps && dependencyCount > 0) {
                const addedDeps = Array.from(processedComponents).filter((comp) => !components.includes(comp));
                if (addedDeps.length > 0) {
                    console.log(`ℹ️ Dependencies: ${addedDeps.join(", ")}`);
                }

                if (verbose) {
                    console.log("📌 Dependency relationships:");
                    for (const [comp, deps] of dependencyMap.entries()) {
                        if (components.includes(comp)) {
                            logVerbose(`  - ${comp} depends on: ${Array.from(deps).join(", ")}`);
                        }
                    }
                }
            }
        } else if (successCount > 0 && failCount > 0) {
            console.log(`⚠️ ${successCount} component(s) added, ${failCount} failed.`);
        } else {
            console.error(`❌ No components were added. All ${failCount} component(s) failed.`);
            process.exit(1);
        }

        fs.removeSync(tempDir);
    } catch (error) {
        if (error instanceof Error) {
            if (verbose) {
                console.error(`❌ Detailed error information:`);
                console.error(error.stack);
            } else {
                console.error(`❌ Error occurred: ${error.message}`);
            }
        } else {
            console.error(`❌ Unknown error occurred`);
        }

        fs.removeSync(tempDir);
        process.exit(1);
    }
}
