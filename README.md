# PrimeVue Volt-Vue CLI

A powerful command-line interface tool designed to streamline the integration of PrimeVue Volt UI components into your projects. Volt CLI enables developers to effortlessly add pre-built, high-quality UI components to their applications without manual copying or configuration.

## Description

PrimeVue Volt CLI is a developer utility that simplifies the process of adding PrimeVue's Volt component collection to any project. Instead of manually downloading and configuring components, this tool automatically fetches the latest components from the official PrimeVue repository and installs them into your project structure.

### Key Features

-   **Simple Component Installation**: Add individual components or the entire Volt collection with a single command
-   **Flexible Installation Options**: Choose where components are installed in your project structure
-   **Built-in Utilities**: Automatically includes required utility files for proper component functionality
-   **Developer-Friendly**: Clear error messages and optional verbose mode for detailed debugging
-   **Time-Saving**: Eliminates manual copying and ensures consistent implementation

## Why Use Volt CLI?

Volt CLI significantly reduces the development time needed to incorporate UI components by:

1. Automating the component acquisition process
2. Ensuring all dependencies are properly installed
3. Maintaining consistency across component implementations
4. Simplifying updates to the latest component versions
5. Providing a standardized workflow for team development

Whether you're building a new project or enhancing an existing application, Volt CLI makes it easy to leverage PrimeVue's professional UI components without disrupting your development workflow.

## Installation

You can use Volt-Vue directly with npx without installing it globally:

```bash
npx volt-vue [command] [options]
```

### Commands

#### Add Components

Add components to your Vue project:

```bash
npx volt-vue add [components]
```

Add all Volt components to your Vue project:

```bash
npx volt-vue add all
```

#### Options

| Option                 | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `--no-src-dir`         | Install to root directory instead of src directory      |
| `--outdir <directory>` | Specify output directory (overrides src-dir option)     |
| `--no-deps`            | Don't automatically install dependencies                |
| `--verbose`            | Show detailed error messages and additional information |
| `-v, --version`        | Output the current version                              |
| `--help`               | Display help for command                                |
