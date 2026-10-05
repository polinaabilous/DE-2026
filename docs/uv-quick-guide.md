# uv quick guide

`uv` manages Python versions, packages, project environments, and command-line tools. An environment keeps each project's packages separate. [Feature overview](https://docs.astral.sh/uv/getting-started/features/)

Run these commands in Terminal on macOS. uv and Python 3.12 are already installed on this computer. If Terminal cannot find `uv`, open a new terminal or run:

```sh
source "$HOME/.local/bin/env"
uv --version
```

## Why separate environments? A C# analogy

A project contains your code and configuration. Its Python environment provides the Python interpreter and installed packages that code uses.

In C#, each project's `.csproj` declares its NuGet dependencies, so different projects can use different versions of the same library. Python virtual environments provide similar separation for installed packages.

For example, project A might need `pandas 1.5`, while project B needs `pandas 2.2`. If both use the same environment, upgrading pandas for B could break A. Separate environments let each keep the version it needs.

| C# concept | Python with uv |
| --- | --- |
| `.csproj` declares dependencies | `pyproject.toml` declares dependencies |
| NuGet restores packages | `uv sync` installs packages |
| Project uses its selected dependencies | `.venv/` holds the project's installed packages |
| `dotnet run` | `uv run` |

Think of **projects as kitchens and environments as their cupboards**. Each kitchen has the ingredients and versions it needs. Changing one cupboard doesn't affect another.

Usually you have **one `.venv` per project**, shared by all its Python files. uv manages it for you:

```sh
uv add pandas       # Add pandas to this project
uv run main.py      # Run using this project's environment
```

## Manage Python versions

```sh
uv python install 3.12       # Install Python 3.12
uv python list --only-installed
uv python find 3.12          # Show the interpreter's path
python3.12 --version
```

Inside a project, `uv python pin 3.12` saves the selected version in `.python-version`. Installing Python through uv does not automatically change your system's `python3`. [Python guide](https://docs.astral.sh/uv/guides/install-python/)

## Create and run a project

Start a new folder for Python practice:

```sh
uv init --app --no-package --python 3.12 analytics-engineering-lab
cd analytics-engineering-lab
uv add duckdb pandas         # Add packages used by your code
uv add --dev pytest ruff     # Add testing and code-checking tools
uv run python --version
uv run main.py              # Run the generated starter script
```

`uv run` prepares the project's environment and runs your command in it; activation is unnecessary. Once you write a script or tests, use `uv run python your_script.py` or `uv run pytest`.

Key files:

| File | Purpose |
| --- | --- |
| `pyproject.toml` | Project settings and declared dependencies |
| `.python-version` | Selected Python version |
| `uv.lock` | Resolved package versions for repeatable installs |
| `.venv/` | Local environment containing installed packages |

Commit the first three files to Git; keep `.venv/` out of Git.

```sh
uv sync                      # Recreate/update the environment
uv sync --locked             # Require an up-to-date lockfile (useful in CI)
uv tree                      # Show dependencies and their dependencies
uv remove pandas             # Remove a project dependency
uv lock --upgrade-package duckdb
uv sync                      # Install the updated locked versions
```

Run project commands from the folder containing `pyproject.toml`. [Project guide](https://docs.astral.sh/uv/guides/projects/)

## Run a standalone script

For an existing script outside a project:

```sh
uv run --python 3.12 example.py
uv run --python 3.12 --with pandas example.py
```

`--with` supplies a dependency for that run. To store dependencies directly in the script for future runs:

```sh
uv add --script example.py pandas
uv run example.py
```

[Script guide](https://docs.astral.sh/uv/guides/scripts/)

## Run or install command-line tools

```sh
uvx ruff check .             # Run Ruff in a separate tool environment
uv tool install ruff        # Install Ruff for use across projects
uv tool list
uv tool upgrade ruff
```

`uvx` is shorthand for `uv tool run`. For a tool declared in your project, use `uv run ruff check .` to use the project's version. [Tool guide](https://docs.astral.sh/uv/guides/tools/)

## Work with an existing requirements.txt

In a folder containing `requirements.txt`:

```sh
uv venv --python 3.12
source .venv/bin/activate
uv pip install -r requirements.txt
python your_script.py
deactivate
```

`uv pip install` installs into an environment; `uv add` also records project dependencies. For new uv projects, use `uv add` and `uv run`. [Environment guide](https://docs.astral.sh/uv/pip/environments/)

## Help and updates

```sh
uv --help
uv add --help
uv self update              # Update uv installed via the standalone installer
```

[Installation and updates](https://docs.astral.sh/uv/getting-started/installation/)
