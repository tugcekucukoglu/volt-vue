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

        const utilsPath = path.join(voltSourceDir, "utils.ts");
        const targetUtilsPath = path.join(voltDir, "utils.ts");

        if (fs.existsSync(utilsPath)) {
            fs.ensureDirSync(voltDir);
            fs.copySync(utilsPath, targetUtilsPath);
        } else {
            console.warn(`⚠️ Utils folder not found in the repository.`);
        }

        let successCount = 0;
        let failCount = 0;
        const processedComponents = new Set<string>();
        const componentsToProcess = [...components];
        const dependencyMap = new Map<string, Set<string>>();
        const componentFileMap = new Map<string, string>();
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

        const copyComponent = (component: string): boolean => {
            if (processedComponents.has(component)) return true;

            let componentFile = `${capitalize(component)}.vue`;
            let voltComponentPath = path.join(voltSourceDir, componentFile);

            if (!fs.existsSync(voltComponentPath)) {
                const files = fs.readdirSync(voltSourceDir);
                const matchingFile = files.find((file) => file.toLowerCase() === `${component.toLowerCase()}.vue`);

                if (matchingFile) {
                    componentFile = matchingFile;
                    voltComponentPath = path.join(voltSourceDir, componentFile);
                } else {
                    console.error(`❌ Component ${component} not found!`);
                    return false;
                }
            }

            componentFileMap.set(component.toLowerCase(), componentFile);

            const targetComponentPath = path.join(voltDir, componentFile);
            fs.ensureDirSync(path.dirname(targetComponentPath));
            fs.copySync(voltComponentPath, targetComponentPath);

            processedComponents.add(component);
            logVerbose(`📌 Copied component: ${component} (${componentFile})`);

            return true;
        };

        const analyzeImports = (component: string): void => {
            if (!options.deps) {
                logVerbose(`📌 Skipping dependency analysis for ${component} (--no-deps option used)`);
                return;
            }

            const componentFile = componentFileMap.get(component.toLowerCase()) || `${capitalize(component)}.vue`;
            const componentPath = path.join(voltSourceDir, componentFile);

            if (!fs.existsSync(componentPath)) return;

            const content = fs.readFileSync(componentPath, "utf8");
            const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]\.\/([\w]+)(?:\.vue)?['"]/g;
            const dependencies = new Set<string>();
            let match;

            while ((match = importRegex.exec(content)) !== null) {
                const exactDependencyName = match[1];

                if (exactDependencyName === "utils") continue;

                if (!componentFileMap.has(exactDependencyName)) {
                    componentFileMap.set(exactDependencyName, `${exactDependencyName}.vue`);
                }

                dependencies.add(exactDependencyName);

                if (components.includes(exactDependencyName)) continue;

                if (
                    !processedComponents.has(exactDependencyName) &&
                    !componentsToProcess.includes(exactDependencyName)
                ) {
                    logVerbose(`📌 Found dependency in ${component}: ${exactDependencyName}`);
                    componentsToProcess.push(exactDependencyName);
                }
            }

            if (dependencies.size > 0) {
                dependencyMap.set(component, dependencies);
            }
        };

        while (componentsToProcess.length > 0) {
            const component = componentsToProcess.shift()!;

            if (copyComponent(component)) {
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
