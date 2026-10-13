# uv quick reference

## What it is

uv is a Python development tool that manages Python versions, project dependencies, virtual environments, scripts, and command-line tools. [Feature overview](https://docs.astral.sh/uv/getting-started/features/)

A **project** holds code and configuration; an **environment** holds the interpreter and installed packages it uses. Separate environments let projects use different package versions without affecting one another. Usually each project has one `.venv/`, shared by its Python files.

Think of projects as kitchens and environments as their cupboards: each kitchen keeps the ingredients it needs. In C#, `.csproj` declares NuGet dependencies; in a uv project, `pyproject.toml` declares Python dependencies and `.venv/` holds installed packages.

## Main features

| Feature | Main commands |
| --- | --- |
| Install and select Python | `uv python install`, `uv python pin` |
| Create projects and manage dependencies | `uv init`, `uv add`, `uv remove` |
| Restore reproducible environments | `uv lock`, `uv sync` |
| Run project code and scripts | `uv run` |
| Run tools in separate environments | `uvx`, `uv tool install` |
| Manage environments with a pip-style interface | `uv venv`, `uv pip install` |

## Common workflows

Run commands in a terminal. Versions, package names, folders, and filenames below are examples; substitute your own. [Installation options](https://docs.astral.sh/uv/getting-started/installation/)

### Install and select Python

```sh
uv python install 3.12         # Install a Python version
uv python list --only-installed
uv python find 3.12            # Show the interpreter path
uv python pin 3.12             # Select this version for the current project
```

Pinning writes `.python-version`; installing through uv does not automatically replace the system's `python` command. [Python guide](https://docs.astral.sh/uv/guides/install-python/)

### Create a project and run code

```sh
uv init --app --no-package --python 3.12 my-project
cd my-project
uv add requests               # Add a runtime dependency
uv add --dev pytest ruff       # Add development tools
uv run main.py                # Run the generated starter script
uv run python --version       # Check the project's Python
```

For an existing folder, use `uv init --app --no-package --python 3.12` inside it. Run project commands from the folder containing `pyproject.toml`. `uv run` prepares the environment automatically; activation is unnecessary.

### Restore, inspect, and update dependencies

```sh
uv sync                       # Install the project's locked dependencies
uv sync --locked              # Fail if the lockfile needs updating (useful in CI)
uv tree                       # Inspect the dependency tree
uv lock --upgrade-package requests  # Update an existing dependency's lock entry
uv sync                       # Install the newly locked versions
uv remove requests            # Remove a dependency when no longer needed
```

| File | Purpose |
| --- | --- |
| `pyproject.toml` | Project metadata and dependency requirements |
| `.python-version` | Selected Python version |
| `uv.lock` | Exact resolved package versions; managed by uv |
| `.venv/` | Local environment; can be recreated with `uv sync` |

Commit configuration and the lockfile to version control; exclude `.venv/`. [Project guide](https://docs.astral.sh/uv/guides/projects/)

### Run an existing standalone script

Outside a project:

```sh
uv run --python 3.12 script.py
uv run --python 3.12 --with requests script.py  # Supply a dependency for this run
uv add --script script.py requests            # Store dependencies in the script
uv run script.py
```

[Script guide](https://docs.astral.sh/uv/guides/scripts/)

### Run or install tools

```sh
uvx ruff check .              # Check code without adding Ruff to the project
uvx ruff format .             # Format code; modifies files
uv tool install ruff          # Install the tool for use across projects
uv tool list
uv tool upgrade ruff
```

`uvx` means `uv tool run`; `.` means the current folder. For a tool declared in a project, use `uv run ruff check .` to use its project version. [Tool guide](https://docs.astral.sh/uv/guides/tools/)

### Use an existing requirements.txt

```sh
uv venv --python 3.12
uv pip install --python .venv -r requirements.txt
```

Activate the environment before running `python script.py` directly:

```sh
# macOS/Linux (bash or zsh)
source .venv/bin/activate
python script.py
deactivate
```

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
python script.py
deactivate
```

`uv pip install` installs packages into an environment; `uv add` also records project dependencies. [Environment guide](https://docs.astral.sh/uv/pip/environments/)

## Help and updates

```sh
uv --version
uv --help
uv add --help
uv self update                # For installations using the standalone installer
```

For package-manager installations, update uv through that package manager. [Update guide](https://docs.astral.sh/uv/getting-started/installation/#upgrading-uv)
